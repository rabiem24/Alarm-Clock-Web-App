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
});
