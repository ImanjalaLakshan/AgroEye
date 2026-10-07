import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Lock, Globe, Bell, Sprout, Moon, Sun, Trash2, Info } from 'lucide-react';
import { auth, db } from '../firebase';
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { ref, get, update, remove } from 'firebase/database';

type Language = 'en' | 'si' | 'ta';

interface SettingsProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function Settings({ darkMode, toggleDarkMode }: SettingsProps) {
  const currentUser = auth.currentUser;

  // Profile
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Preferences
  const [language, setLanguage] = useState<Language>('en');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load saved preferences
  useEffect(() => {
    if (!currentUser) return;
    const prefsRef = ref(db, `users/${currentUser.uid}/preferences`);
    get(prefsRef).then((snapshot) => {
      const value = snapshot.val();
      if (value) {
        setLanguage(value.language || 'en');
        setEmailNotifications(value.emailNotifications !== false);
      }
    });
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser || !displayName.trim()) return;
    setProfileSaving(true);
    setProfileMsg('');
    try {
      await updateProfile(currentUser, { displayName });
      await update(ref(db, `users/${currentUser.uid}`), { name: displayName });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setProfileMsg('Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMsg('');
    if (!currentUser || !currentUser.email) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPasswordMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.');
      } else if (err.code === 'auth/too-many-requests') {
        setPasswordError('Too many attempts. Please try again later.');
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!currentUser) return;
    setPrefsSaving(true);
    setPrefsMsg('');
    try {
      await update(ref(db, `users/${currentUser.uid}/preferences`), {
        language,
        emailNotifications,
      });
      setPrefsMsg('Preferences saved.');
      setTimeout(() => setPrefsMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setPrefsMsg('Failed to save preferences.');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!currentUser || !currentUser.email) return;
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);
      await remove(ref(db, `users/${currentUser.uid}`));
      await deleteUser(currentUser);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Password is incorrect.');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
      }
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-50 p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-green-800">Settings</h1>
            <p className="text-green-600 text-sm">Manage your account and preferences</p>
          </div>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="display-name">Full Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-2"
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="email-readonly">Email Address</Label>
              <Input
                id="email-readonly"
                value={currentUser?.email || ''}
                readOnly
                disabled
                className="mt-2 bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email address cannot be changed here.</p>
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {profileMsg}
              </p>
            )}
            <Button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Lock className="w-5 h-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2"
                placeholder="Re-enter new password"
              />
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Globe className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>Language</Label>
              <div className="flex gap-2 mt-2">
                {([
                  { code: 'en', label: 'English' },
                  { code: 'si', label: 'සිංහල' },
                  { code: 'ta', label: 'தமிழ்' },
                ] as { code: Language; label: string }[]).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      language === lang.code
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-green-700 border border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-green-100 pt-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-green-800 text-sm">Email Notifications</p>
                  <p className="text-green-600 text-xs">Receive email alerts for assignments and updates</p>
                </div>
              </div>
              <div className="theme-toggle-switch flex items-center gap-2">
                <span className="text-sm text-gray-600 w-6 text-right">
                  {emailNotifications ? 'On' : 'Off'}
                </span>
                <button
                  type="button"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  style={{ backgroundColor: emailNotifications ? '#2563eb' : '#9ca3af' }}
                  className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
                >
                  <div
                    style={{
                      transform: emailNotifications ? 'translateX(22px)' : 'translateX(3px)',
                      backgroundColor: '#000000',
                    }}
                    className="absolute top-1 w-5 h-5 rounded-full transition-transform"
                  />
                </button>
              </div>
            </div>

            {prefsMsg && <p className="text-sm text-green-600">{prefsMsg}</p>}
            <Button
              onClick={handleSavePreferences}
              disabled={prefsSaving}
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
            >
              {prefsSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 text-sm">Dark Mode</p>
                <p className="text-green-600 text-xs">Switch between light and dark theme</p>
              </div>
              <div className="theme-toggle-switch flex items-center gap-2">
                <span className="text-sm text-gray-600 w-6 text-right">
                  {darkMode ? 'On' : 'Off'}
                </span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  style={{ backgroundColor: darkMode ? '#2563eb' : '#9ca3af' }}
                  className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0"
                >
                  <div
                    style={{
                      transform: darkMode ? 'translateX(22px)' : 'translateX(3px)',
                      backgroundColor: '#000000',
                    }}
                    className="absolute top-1 w-5 h-5 rounded-full transition-transform"
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Info className="w-5 h-5" />
              About AgroEye
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-600">App Version</span>
              <span className="text-green-800">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">Developer</span>
              <span className="text-green-800">AgroEye Team</span>
            </div>
            <p className="text-green-600 text-xs pt-2 border-t border-green-100">
              AgroEye is a smart paddy field monitoring system that uses real-time IoT
              sensors to help farmers track soil moisture, temperature, and humidity.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone - Delete Account */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Deleting your account is permanent and cannot be undone. All your profile
              data will be removed.
            </p>

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-3 bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">
                  Enter your password to confirm account deletion.
                </p>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
                {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}