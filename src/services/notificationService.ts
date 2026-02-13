import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_STORAGE_KEY = '@geomemo:notification_permission';
const DAILY_NOTIFICATION_SCHEDULED_KEY = '@geomemo:daily_notification_scheduled';

/**
 * Request notification permission from user
 * Returns true if granted, false otherwise
 * Non-blocking - app continues to work regardless
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, 'granted');
      return true;
    }
    
    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, status);
    
    return status === 'granted';
  } catch (error) {
    console.log('Notification permission error (non-critical):', error);
    return false;
  }
}

/**
 * Check current notification permission status
 * Returns true if granted
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.log('Error checking notification permission:', error);
    return false;
  }
}

/**
 * Schedule daily reminder notification at 9:00 AM
 * Silently fails if permission not granted
 * Prevents duplicate notifications by checking if already scheduled
 */
export async function scheduleDailyNotification(): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;
  
  try {
    // Check if we already have a daily notification scheduled
    const isAlreadyScheduled = await AsyncStorage.getItem(DAILY_NOTIFICATION_SCHEDULED_KEY);
    if (isAlreadyScheduled === 'true') {
      console.log('Daily notification already scheduled');
      return;
    }
    
    // Cancel any existing daily notifications (cleanup)
    await cancelDailyNotifications();
    
    // Schedule for 9:00 AM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GeoMemo',
        body: 'Check what\'s going on around you',
        data: { screen: 'Map' },
      },
      trigger: {
        type: 'daily',
        hour: 9,
        minute: 0,
        repeats: true,
      } as any,
    });
    
    // Mark as scheduled
    await AsyncStorage.setItem(DAILY_NOTIFICATION_SCHEDULED_KEY, 'true');
    console.log('Daily notification scheduled for 9:00 AM');
  } catch (error) {
    console.log('Error scheduling daily notification (non-critical):', error);
  }
}

/**
 * Send immediate notification when someone tips your post
 * Works in both demo and real mode
 */
export async function sendTipNotification(postId: string): Promise<void> {
  const hasPermission = await checkNotificationPermission();
  if (!hasPermission) return;
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GeoMemo',
        body: 'Someone tipped your post!',
        data: { screen: 'PostDetail', postId },
      },
      trigger: null, // Immediate
    });
    
    console.log('Tip notification sent for post:', postId);
  } catch (error) {
    console.log('Error sending tip notification (non-critical):', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Clear the scheduled flag since all notifications are cancelled
    await AsyncStorage.removeItem(DAILY_NOTIFICATION_SCHEDULED_KEY);
  } catch (error) {
    console.log('Error canceling notifications:', error);
  }
}

/**
 * Cancel only daily notifications
 */
export async function cancelDailyNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.body === 'Check what\'s going on around you') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    
    // Clear the scheduled flag
    await AsyncStorage.removeItem(DAILY_NOTIFICATION_SCHEDULED_KEY);
  } catch (error) {
    console.log('Error canceling daily notifications:', error);
  }
}

/**
 * Set up notification response listener
 * Handles when user taps on a notification
 */
export function setupNotificationResponseListener(
  navigationRef: React.RefObject<any>
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      try {
        const data = response.notification.request.content.data;
        
        if (!data || !navigationRef.current) return;
        
        const { screen, postId } = data;
        
        // Navigate after a short delay to ensure app is ready
        setTimeout(() => {
          if (screen === 'Map') {
            navigationRef.current.navigate('Map');
          } else if (screen === 'PostDetail' && postId) {
            // Navigate to PostDetail - we'll need to fetch the post data
            // For now, navigate to Map (user can find their post there)
            navigationRef.current.navigate('Map');
            console.log('Notification tapped - should navigate to post:', postId);
            // TODO: Implement deep linking to specific post
          }
        }, 500);
      } catch (error) {
        console.log('Error handling notification response:', error);
      }
    }
  );
  
  return () => subscription.remove();
}

/**
 * Initialize notifications on app start
 * Requests permission and schedules daily notification
 * Non-blocking - app works regardless of permission
 */
export async function initializeNotifications(): Promise<void> {
  // Request permission (user can deny, app continues normally)
  await requestNotificationPermission();
  
  // Schedule daily notification (only if permission granted)
  await scheduleDailyNotification();
}
