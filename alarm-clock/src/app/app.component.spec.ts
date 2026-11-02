import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';

const STORAGE_KEY = 'alarm-clock.alarms';

// ---- Reusable test helpers -------------------------------------------------

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: string = 'suspended';
  currentTime = 0;
  destination = { name: 'destination' };
  resume = jasmine.createSpy('resume').and.callFake(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  oscillators: any[] = [];
  gains: any[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): any {
    const osc: any = {
      frequency: { value: 0 },
      type: 'sine',
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop')
    };
    osc.connect = jasmine.createSpy('connect').and.callFake((node: any) => node);
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): any {
    const gain: any = { gain: { value: 0 } };
    gain.connect = jasmine.createSpy('connect').and.callFake((node: any) => node);
    this.gains.push(gain);
    return gain;
  }
}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let originalAudioContext: any;
  let originalNotification: any;
  let notificationStub: any;

  const stored = (): any[] => JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
  const makeAlarm = (id: number, time: string, label = '', enabled = true): any => ({ id, time, label, enabled });

  beforeEach(async () => {
    localStorage.removeItem(STORAGE_KEY);

    originalAudioContext = (window as any).AudioContext;
    FakeAudioContext.instances = [];
    (window as any).AudioContext = FakeAudioContext;

    originalNotification = (window as any).Notification;
    notificationStub = function () { /* no-op */ };
    notificationStub.permission = 'denied';
    notificationStub.requestPermission = jasmine.createSpy('requestPermission');
    (window as any).Notification = notificationStub;

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [AppComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy(); // runs ngOnDestroy -> clears intervals
    (window as any).AudioContext = originalAudioContext;
    (window as any).Notification = originalNotification;
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should create the component with default state', () => {
    expect(component).toBeTruthy();
    expect(component.alarms).toEqual([]);
    expect(component.newTime).toBe('07:00');
    expect(component.ringing).toBeNull();
  });

  describe('sortedAlarms', () => {
    it('should order alarms by time ascending', () => {
      component.alarms = [makeAlarm(1, '18:00'), makeAlarm(2, '06:30'), makeAlarm(3, '12:15')];

      const result = component.sortedAlarms.map(a => a.time);

      expect(result).toEqual(['06:30', '12:15', '18:00']);
    });

    it('should not mutate the original alarms array', () => {
      component.alarms = [makeAlarm(1, '18:00'), makeAlarm(2, '06:30')];

      const sorted = component.sortedAlarms;

      expect(sorted).not.toBe(component.alarms);
      expect(component.alarms.map(a => a.id)).toEqual([1, 2]);
    });
  });

  describe('format', () => {
    it('should format midnight hour as 12 AM', () => {
      expect(component.format('00:05')).toBe('12:05 AM');
    });

    it('should format noon as 12 PM', () => {
      expect(component.format('12:00')).toBe('12:00 PM');
    });

    it('should convert afternoon hours to 12-hour PM', () => {
      expect(component.format('13:30')).toBe('1:30 PM');
    });

    it('should not pad the hour but pad the minutes in the morning', () => {
      expect(component.format('09:07')).toBe('9:07 AM');
    });

    it('should format the last minute of the day', () => {
      expect(component.format('23:59')).toBe('11:59 PM');
    });
  });

  describe('addAlarm', () => {
    it('should do nothing when newTime is empty', () => {
      component.newTime = '';

      component.addAlarm();

      expect(component.alarms.length).toBe(0);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(FakeAudioContext.instances.length).toBe(0);
    });

    it('should add an enabled alarm with the chosen time and trimmed label', () => {
      component.newTime = '08:15';
      component.newLabel = '  Wake up  ';

      component.addAlarm();

      expect(component.alarms.length).toBe(1);
      expect(component.alarms[0].time).toBe('08:15');
      expect(component.alarms[0].label).toBe('Wake up');
      expect(component.alarms[0].enabled).toBeTrue();
    });

    it('should reset newLabel after adding', () => {
      component.newLabel = 'Gym';

      component.addAlarm();

      expect(component.newLabel).toBe('');
    });

    it('should persist the alarm to localStorage', () => {
      component.newTime = '06:00';
      component.newLabel = 'Run';

      component.addAlarm();

      const saved = stored();
      expect(saved.length).toBe(1);
      expect(saved[0].time).toBe('06:00');
      expect(saved[0].label).toBe('Run');
      expect(saved[0].enabled).toBeTrue();
    });

    it('should create and resume the audio context to unlock audio', () => {
      component.addAlarm();

      expect(FakeAudioContext.instances.length).toBe(1);
      expect(FakeAudioContext.instances[0].resume).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should disable an enabled alarm and clear lastFired', () => {
      const alarm = { ...makeAlarm(1, '07:00'), lastFired: '2026-11-02 07:00' };
      component.alarms = [alarm];

      component.toggle(alarm);

      expect(alarm.enabled).toBeFalse();
      expect(alarm.lastFired).toBeUndefined();
    });

    it('should re-enable a disabled alarm', () => {
      const alarm = makeAlarm(1, '07:00', '', false);
      component.alarms = [alarm];

      component.toggle(alarm);

      expect(alarm.enabled).toBeTrue();
    });

    it('should persist the toggled state', () => {
      const alarm = makeAlarm(1, '07:00');
      component.alarms = [alarm];

      component.toggle(alarm);

      expect(stored()[0].enabled).toBeFalse();
    });

    it('should not resume an audio context that is already running', () => {
      const alarm = makeAlarm(1, '07:00');
      component.alarms = [alarm];

      component.toggle(alarm); // creates ctx (suspended) and resumes -> running
      const ctx = FakeAudioContext.instances[0];
      ctx.resume.calls.reset();
      component.toggle(alarm);

      expect(ctx.resume).not.toHaveBeenCalled();
      expect(FakeAudioContext.instances.length).toBe(1);
    });
  });

  describe('remove', () => {
    it('should remove only the alarm with the matching id', () => {
      const a = makeAlarm(1, '06:00');
      const b = makeAlarm(2, '07:00');
      const c = makeAlarm(3, '08:00');
      component.alarms = [a, b, c];

      component.remove(b);

      expect(component.alarms.map(x => x.id)).toEqual([1, 3]);
    });

    it('should persist the remaining alarms', () => {
      const a = makeAlarm(1, '06:00');
      const b = makeAlarm(2, '07:00');
      component.alarms = [a, b];

      component.remove(a);

      expect(stored().map(x => x.id)).toEqual([2]);
    });
  });

  describe('load (via ngOnInit)', () => {
    it('should restore alarms from valid JSON in localStorage', () => {
      const saved = [makeAlarm(10, '05:00', 'Early'), makeAlarm(11, '22:00', 'Late', false)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      fixture.detectChanges();

      expect(component.alarms).toEqual(saved);
    });

    it('should default to an empty list when nothing is stored', () => {
      fixture.detectChanges();

      expect(component.alarms).toEqual([]);
    });

    it('should default to an empty list when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      fixture.detectChanges();

      expect(component.alarms).toEqual([]);
    });

    it('should request notification permission when it is "default"', () => {
      notificationStub.permission = 'default';

      fixture.detectChanges();

      expect(notificationStub.requestPermission).toHaveBeenCalledTimes(1);
    });

    it('should not request notification permission when already decided', () => {
      fixture.detectChanges();

      expect(notificationStub.requestPermission).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should write the alarms as JSON under the storage key', () => {
      component.alarms = [makeAlarm(5, '09:00', 'Meeting')];

      (component as any).save();

      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(component.alarms));
    });
  });

  // ---- Time-controlled behaviour (jasmine.clock: mocked Date + timers) -------

  describe('with a mocked clock', () => {
    const at = (h: number, m: number, sec = 0) => jasmine.clock().mockDate(new Date(2026, 10, 2, h, m, sec));
    const oscillators = () => FakeAudioContext.instances[0].oscillators;

    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      fixture.destroy(); // clear (fake) intervals before the clock is uninstalled
      jasmine.clock().uninstall();
    });

    describe('ngOnInit', () => {
      it('should load saved alarms and start a 1 second interval that updates now', () => {
        at(7, 0, 0);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([makeAlarm(1, '09:00', 'Saved', false)]));
        fixture.detectChanges();
        jasmine.clock().tick(1000);
        const before = component.now.getTime();

        jasmine.clock().tick(3000);

        expect(component.alarms.length).toBe(1);
        expect(component.now.getTime() - before).toBe(3000);
      });

      it('should not request permission when it is "denied"', () => {
        notificationStub.permission = 'denied';

        fixture.detectChanges();

        expect(notificationStub.requestPermission).not.toHaveBeenCalled();
      });

      it('should not request permission when it is "granted"', () => {
        notificationStub.permission = 'granted';

        fixture.detectChanges();

        expect(notificationStub.requestPermission).not.toHaveBeenCalled();
      });

      it('should not throw when the Notification API is unavailable', () => {
        delete (window as any).Notification;

        expect(() => fixture.detectChanges()).not.toThrow();
        expect(component.alarms).toEqual([]);
      });
    });

    describe('ngOnDestroy', () => {
      it('should stop the interval so now no longer updates', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        jasmine.clock().tick(1000);
        const frozen = component.now.getTime();

        component.ngOnDestroy();
        jasmine.clock().tick(5000);

        expect(component.now.getTime()).toBe(frozen);
      });

      it('should stop the beeping sound', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];
        jasmine.clock().tick(1000); // rings, first beep
        jasmine.clock().tick(600);
        const beeps = oscillators().length;

        component.ngOnDestroy();
        jasmine.clock().tick(3000);

        expect(oscillators().length).toBe(beeps);
      });
    });

    describe('tick (via interval)', () => {
      it('should ring an enabled alarm matching the current time', () => {
        at(7, 0, 0);
        const alarm = makeAlarm(1, '07:00', 'Wake');
        fixture.detectChanges();
        component.alarms = [alarm];

        jasmine.clock().tick(1000);

        expect(component.ringing).toBe(alarm);
      });

      it('should set lastFired and persist the alarm when it fires', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00', 'Wake')];

        jasmine.clock().tick(1000);

        expect(component.alarms[0].lastFired).toBe('2026-11-02 07:00');
        expect(stored()[0].lastFired).toBe('2026-11-02 07:00');
      });

      it('should not re-fire the same alarm within the same minute', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];
        jasmine.clock().tick(1000);
        component.dismiss();
        const beeps = oscillators().length;

        jasmine.clock().tick(5000);

        expect(component.ringing).toBeNull();
        expect(oscillators().length).toBe(beeps);
      });

      it('should ignore disabled alarms', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00', '', false)];

        jasmine.clock().tick(2000);

        expect(component.ringing).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      });

      it('should ignore alarms that do not match the current time', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:01'), makeAlarm(2, '19:00')];

        jasmine.clock().tick(2000);

        expect(component.ringing).toBeNull();
      });

      it('should fire an alarm once the clock reaches its minute', () => {
        at(6, 59, 58);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];

        jasmine.clock().tick(1000);
        expect(component.ringing).toBeNull();
        jasmine.clock().tick(1000);

        expect(component.ringing).not.toBeNull();
      });

      it('should keep updating now but not fire other alarms while ringing', () => {
        at(7, 0, 0);
        const first = makeAlarm(1, '07:00');
        const second = makeAlarm(2, '07:00');
        fixture.detectChanges();
        component.alarms = [first, second];

        jasmine.clock().tick(1000);
        const nowAtRing = component.now.getTime();
        jasmine.clock().tick(2000);

        expect(component.ringing).toBe(first);
        expect(second.lastFired).toBeUndefined();
        expect(component.now.getTime()).toBe(nowAtRing + 2000);
      });
    });

    describe('ring', () => {
      let notificationCtor: jasmine.Spy;

      beforeEach(() => {
        notificationCtor = jasmine.createSpy('Notification');
        (notificationCtor as any).permission = 'granted';
        (notificationCtor as any).requestPermission = jasmine.createSpy('requestPermission');
        (window as any).Notification = notificationCtor;
      });

      it('should create a notification with the label as body when granted', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00', 'Stand-up')];

        jasmine.clock().tick(1000);

        expect(notificationCtor).toHaveBeenCalledOnceWith('Alarm', { body: 'Stand-up' });
      });

      it('should use the formatted time as body when the label is empty', () => {
        at(19, 5, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '19:05')];

        jasmine.clock().tick(1000);

        expect(notificationCtor).toHaveBeenCalledOnceWith('Alarm', { body: '7:05 PM' });
      });

      it('should not create a notification when permission is denied but still ring', () => {
        (notificationCtor as any).permission = 'denied';
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00', 'Silent')];

        jasmine.clock().tick(1000);

        expect(notificationCtor).not.toHaveBeenCalled();
        expect(component.ringing).not.toBeNull();
      });

      it('should not throw when the Notification API is unavailable', () => {
        delete (window as any).Notification;
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];

        expect(() => jasmine.clock().tick(1000)).not.toThrow();
        expect(component.ringing).not.toBeNull();
      });
    });

    describe('sound while ringing', () => {
      const startRinging = () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];
        jasmine.clock().tick(1000);
      };

      it('should beep immediately with a square 880 Hz tone at 0.15 gain', () => {
        startRinging();

        const ctx = FakeAudioContext.instances[0];
        expect(ctx.oscillators.length).toBe(1);
        expect(ctx.oscillators[0].type).toBe('square');
        expect(ctx.oscillators[0].frequency.value).toBe(880);
        expect(ctx.gains[0].gain.value).toBe(0.15);
        expect(ctx.oscillators[0].start).toHaveBeenCalled();
        expect(ctx.oscillators[0].stop).toHaveBeenCalledWith(0.25);
      });

      it('should repeat the beep every 600 ms', () => {
        startRinging();

        jasmine.clock().tick(600);
        expect(oscillators().length).toBe(2);
        jasmine.clock().tick(1200);

        expect(oscillators().length).toBe(4);
      });

      it('should resume a suspended audio context when ringing starts', () => {
        startRinging();

        const ctx = FakeAudioContext.instances[0];
        expect(ctx.resume).toHaveBeenCalled();
        expect(ctx.state).toBe('running');
      });
    });

    describe('dismiss', () => {
      it('should clear ringing and stop the beeps', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];
        jasmine.clock().tick(1000);
        const beeps = oscillators().length;

        component.dismiss();
        jasmine.clock().tick(3000);

        expect(component.ringing).toBeNull();
        expect(oscillators().length).toBe(beeps);
      });

      it('should be safe to call when nothing is ringing', () => {
        expect(() => component.dismiss()).not.toThrow();
        expect(component.ringing).toBeNull();
      });
    });

    describe('snooze', () => {
      it('should do nothing when no alarm is ringing', () => {
        component.snooze();

        expect(component.alarms.length).toBe(0);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      });

      it('should add an alarm 5 minutes ahead labelled with "(snoozed)"', () => {
        at(7, 0, 0);
        component.ringing = makeAlarm(1, '07:00', 'Wake');

        component.snooze();

        expect(component.alarms.length).toBe(1);
        expect(component.alarms[0].time).toBe('07:05');
        expect(component.alarms[0].label).toBe('Wake (snoozed)');
        expect(component.alarms[0].enabled).toBeTrue();
      });

      it('should use "Alarm (snoozed)" when the label is empty', () => {
        at(7, 0, 0);
        component.ringing = makeAlarm(1, '07:00', '');

        component.snooze();

        expect(component.alarms[0].label).toBe('Alarm (snoozed)');
      });

      it('should persist the snoozed alarm and dismiss the ringing one', () => {
        at(7, 0, 0);
        component.ringing = makeAlarm(1, '07:00', 'Wake');

        component.snooze();

        expect(stored().length).toBe(1);
        expect(stored()[0].label).toBe('Wake (snoozed)');
        expect(component.ringing).toBeNull();
      });

      it('should roll over the hour (07:58 -> 08:03)', () => {
        at(7, 58, 0);
        component.ringing = makeAlarm(1, '07:58');

        component.snooze();

        expect(component.alarms[0].time).toBe('08:03');
      });

      it('should roll over midnight (23:57 -> 00:02)', () => {
        at(23, 57, 0);
        component.ringing = makeAlarm(1, '23:57');

        component.snooze();

        expect(component.alarms[0].time).toBe('00:02');
      });

      it('should stop the beeps and ring again when the snoozed time arrives', () => {
        at(7, 0, 0);
        fixture.detectChanges();
        component.alarms = [makeAlarm(1, '07:00')];
        jasmine.clock().tick(1000);
        const beeps = oscillators().length;

        component.snooze();
        jasmine.clock().tick(2000);
        expect(oscillators().length).toBe(beeps);
        jasmine.clock().tick(5 * 60000);

        expect(component.ringing?.label).toBe('Alarm (snoozed)');
      });
    });
  });
});
