/**
 * DataSafetyBanner — a clear notice when changes did not reach the cloud
 * (with Retry), otherwise a weekly "download a backup" reminder.
 */

import React, { useState } from 'react';
import familyStore from '../store/FamilyStore.js';
import { daysSinceBackup, shouldRemindBackup, snoozeBackupReminder } from '../utils/backupReminder.js';

export default function DataSafetyBanner({ syncStatus, peopleCount, onOpenBackup }) {
  const [retrying, setRetrying] = useState(false);
  const [reminderHidden, setReminderHidden] = useState(false);

  if (syncStatus === 'error') {
    const retry = async () => {
      setRetrying(true);
      try {
        await familyStore.retryFailedSync();
      } finally {
        setRetrying(false);
      }
    };
    return (
      <div className="ft-arrange-banner ft-arrange-banner--warning ft-safety-banner" role="alert">
        <div className="ft-arrange-banner__info">
          <span className="ft-arrange-banner__dot ft-safety-banner__dot--error" />
          <span className="ft-arrange-banner__text">
            <strong>Some changes did not save to the cloud.</strong> They are kept on this device. Retry now, and keep
            this tab open until it says Synced.
          </span>
        </div>
        <button type="button" className="ft-arrange-banner__done-btn" onClick={retry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (reminderHidden || !shouldRemindBackup(peopleCount)) return null;
  const days = daysSinceBackup();
  return (
    <div className="ft-arrange-banner ft-safety-banner" role="status">
      <div className="ft-arrange-banner__info">
        <span className="ft-arrange-banner__dot" />
        <span className="ft-arrange-banner__text">
          <strong>{days === null ? 'No backup downloaded on this device yet.' : `Last backup ${days} days ago.`}</strong>{' '}
          Download one to keep a safe copy of the family tree.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="ft-arrange-banner__done-btn ft-safety-banner__later"
          onClick={() => {
            snoozeBackupReminder();
            setReminderHidden(true);
          }}
        >
          Later
        </button>
        <button
          type="button"
          className="ft-arrange-banner__done-btn"
          onClick={() => {
            setReminderHidden(true);
            onOpenBackup();
          }}
        >
          Back up now
        </button>
      </div>
    </div>
  );
}
