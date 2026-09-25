import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Clock, MessageSquare, Bell, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/notification-settings.css';

export default function NotificationSettings() {
  const { user, updateUser } = useAuth();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    sessionReminders: true,
    newMessageAlerts: true,
    pushNotifications: false,
  });
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [permissionState, setPermissionState] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'unsupported'
  );

  // Sync state from server on mount
  useEffect(() => {
    let active = true;
    const fetchPreferences = async () => {
      try {
        const response = await api.get('/notifications/preferences');
        if (active && response.data?.preferences) {
          setPreferences(response.data.preferences);
        }
      } catch (err) {
        // Fallback to user context or defaults
        if (active && user?.notificationPreferences) {
          setPreferences(user.notificationPreferences);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPreferences();
    return () => { active = false; };
  }, [user]);

  // Track browser Notification permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(window.Notification.permission);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  const handleToggle = useCallback(async (key) => {
    const nextValue = !preferences[key];

    // Special handling for browser push notifications
    if (key === 'pushNotifications') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        showToast('Browser alerts are not supported by this browser.', 'warning');
        return;
      }

      if (nextValue) {
        // Request permission
        try {
          const permission = await window.Notification.requestPermission();
          setPermissionState(permission);
          if (permission !== 'granted') {
            showToast('Permission not granted. Please allow notifications in browser site settings.', 'warning');
            return;
          }
          try {
            localStorage.setItem(`turolink-notifications:${user?.id || user?._id}`, 'enabled');
          } catch {}
        } catch (e) {
          showToast('Unable to request browser permission.', 'warning');
          return;
        }
      } else {
        try {
          localStorage.setItem(`turolink-notifications:${user?.id || user?._id}`, 'off');
        } catch {}
      }
    }

    // Optimistic state update
    const previous = { ...preferences };
    setPreferences(prev => ({ ...prev, [key]: nextValue }));
    setUpdatingKey(key);

    try {
      const response = await api.patch('/notifications/preferences', { [key]: nextValue });
      if (response.data?.preferences) {
        setPreferences(response.data.preferences);
      }
      if (user) {
        updateUser({
          ...user,
          notificationPreferences: {
            ...(user.notificationPreferences || {}),
            [key]: nextValue,
          },
        });
      }
      showToast('Notification preferences updated.', 'success');
    } catch (err) {
      // Rollback on failure
      setPreferences(previous);
      showToast('Failed to save preference. Please try again.', 'warning');
    } finally {
      setUpdatingKey(null);
    }
  }, [preferences, user, updateUser]);

  const items = [
    {
      id: 'emailNotifications',
      title: 'Email Notifications',
      description: 'Receive updates about sessions and messages via email',
      icon: <Mail size={22} />,
      enabled: Boolean(preferences.emailNotifications),
    },
    {
      id: 'sessionReminders',
      title: 'Session Reminders',
      description: 'Get reminded 30 minutes before an upcoming session',
      icon: <Clock size={22} />,
      enabled: Boolean(preferences.sessionReminders),
    },
    {
      id: 'newMessageAlerts',
      title: 'New Message Alerts',
      description: user?.role === 'teacher'
        ? 'Notify me when a student sends a new message'
        : 'Notify me when a tutor or classmate sends a new message',
      icon: <MessageSquare size={22} />,
      enabled: Boolean(preferences.newMessageAlerts),
    },
    {
      id: 'pushNotifications',
      title: 'Push Notifications',
      description: 'Show alerts on this device when the app is closed',
      icon: <Bell size={22} />,
      enabled: Boolean(preferences.pushNotifications),
      badge: permissionState === 'granted' && preferences.pushNotifications
        ? { text: 'Active', class: 'granted' }
        : permissionState === 'denied'
        ? { text: 'Blocked by browser', class: 'denied' }
        : null,
    },
  ];

  return (
    <div className="notif-settings-container">
      <div className="notif-settings-page-header">
        <h1 className="notif-settings-page-title">Notification Settings</h1>
      </div>

      <div className="notif-settings-card">
        <div className="notif-card-header">
          <h2 className="notif-card-title">Notifications</h2>
          <p className="notif-card-subtitle">Choose what you want to be notified about</p>
        </div>

        {feedback && (
          <div className={`notif-feedback-toast ${feedback.type}`} role="status">
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="notif-items-list" role="group" aria-label="Notification channels and preferences">
          {items.map((item) => (
            <div key={item.id} className="notif-item-row">
              <div className="notif-item-left">
                <div className="notif-icon-badge" aria-hidden="true">
                  {item.icon}
                </div>
                <div className="notif-item-text">
                  <div className="notif-item-title-row">
                    <span className="notif-item-title">{item.title}</span>
                    {item.badge && (
                      <span className={`notif-item-badge ${item.badge.class}`}>
                        {item.badge.text}
                      </span>
                    )}
                  </div>
                  <p className="notif-item-desc">{item.description}</p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={item.enabled}
                aria-label={`Toggle ${item.title}`}
                className={`notif-switch-btn ${item.enabled ? 'active' : ''}`}
                disabled={loading || updatingKey === item.id}
                onClick={() => handleToggle(item.id)}
              >
                <span className="notif-switch-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
