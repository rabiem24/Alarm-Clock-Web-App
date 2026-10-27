import { Component, OnDestroy, OnInit } from '@angular/core';

interface Alarm {
  id: number;
  time: string; // "HH:mm" (24h)
  label: string;
  enabled: boolean;
  lastFired?: string; // "YYYY-MM-DD HH:mm" to avoid re-triggering within the same minute
}

const STORAGE_KEY = 'alarm-clock.alarms';
const SNOOZE_MINUTES = 5;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  now = new Date();
  alarms: Alarm[] = [];
  newTime = '07:00';
  newLabel = '';
  ringing: Alarm | null = null;

  private timer?: number;
  private audioCtx?: AudioContext;
  private beepTimer?: number;

  ngOnInit(): void {
    this.load();
    this.timer = window.setInterval(() => this.tick(), 1000);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    this.stopSound();
  }

  get sortedAlarms(): Alarm[] {
    return [...this.alarms].sort((a, b) => a.time.localeCompare(b.time));
  }

  addAlarm(): void {
    if (!this.newTime) return;
    this.alarms.push({
      id: Date.now(),
      time: this.newTime,
      label: this.newLabel.trim(),
      enabled: true
    });
    this.newLabel = '';
    this.save();
    this.unlockAudio();
  }

  toggle(alarm: Alarm): void {
    alarm.enabled = !alarm.enabled;
    alarm.lastFired = undefined;
    this.save();
    this.unlockAudio();
  }

  remove(alarm: Alarm): void {
    this.alarms = this.alarms.filter(a => a.id !== alarm.id);
    this.save();
  }

  dismiss(): void {
    this.stopSound();
    this.ringing = null;
  }

  snooze(): void {
    if (!this.ringing) return;
    const d = new Date(Date.now() + SNOOZE_MINUTES * 60000);
    this.alarms.push({
      id: Date.now(),
      time: `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`,
      label: (this.ringing.label || 'Alarm') + ' (snoozed)',
      enabled: true
    });
    this.save();
    this.dismiss();
  }

  format(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${this.pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  }

  private tick(): void {
    this.now = new Date();
    if (this.ringing) return;
    const hm = `${this.pad(this.now.getHours())}:${this.pad(this.now.getMinutes())}`;
    const stamp = `${this.now.getFullYear()}-${this.pad(this.now.getMonth() + 1)}-${this.pad(this.now.getDate())} ${hm}`;
    const due = this.alarms.find(a => a.enabled && a.time === hm && a.lastFired !== stamp);
    if (due) {
      due.lastFired = stamp;
      this.save();
      this.ring(due);
    }
  }

  private ring(alarm: Alarm): void {
    this.ringing = alarm;
    this.startSound();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Alarm', { body: alarm.label || this.format(alarm.time) });
    }
  }

  // Browsers block audio until a user gesture, so create/resume the context on interaction.
  private unlockAudio(): void {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  private startSound(): void {
    this.unlockAudio();
    const beep = () => {
      const ctx = this.audioCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    };
    beep();
    this.beepTimer = window.setInterval(beep, 600);
  }

  private stopSound(): void {
    clearInterval(this.beepTimer);
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alarms));
  }

  private load(): void {
    try {
      this.alarms = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      this.alarms = [];
    }
  }
}
