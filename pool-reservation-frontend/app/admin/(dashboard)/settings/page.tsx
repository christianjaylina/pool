'use client';

import { useState, useEffect } from 'react';
import { Users, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, Button, Input } from '@/components/ui';
import { poolApi } from '@/lib/api';

interface PoolSettings {
  setting_id?: number;
  max_people_slot_1: number;
  max_people_slot_2: number;
  max_people_slot_3: number;
  max_people_slot_4: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PoolSettings>({
    max_people_slot_1: 10,
    max_people_slot_2: 10,
    max_people_slot_3: 10,
    max_people_slot_4: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await poolApi.getSettings();
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validate all values are positive integers
    const values = [
      settings.max_people_slot_1,
      settings.max_people_slot_2,
      settings.max_people_slot_3,
      settings.max_people_slot_4,
    ];

    if (values.some(v => !Number.isInteger(v) || v < 1)) {
      setError('All capacity values must be positive whole numbers');
      return;
    }

    try {
      setSaving(true);
      await poolApi.updateSettings({
        max_people_slot_1: settings.max_people_slot_1,
        max_people_slot_2: settings.max_people_slot_2,
        max_people_slot_3: settings.max_people_slot_3,
        max_people_slot_4: settings.max_people_slot_4,
      });
      setSuccess('Settings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof PoolSettings, value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, [field]: numValue }));
  };

  // Apply same value to all slots
  const applyToAll = (value: number) => {
    setSettings({
      ...settings,
      max_people_slot_1: value,
      max_people_slot_2: value,
      max_people_slot_3: value,
      max_people_slot_4: value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pool Settings</h1>
          <p className="text-gray-500 mt-1">Configure pool capacity and guest limits</p>
        </div>
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-success-50 text-success-700 rounded-lg">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Capacity Settings */}
      <Card>
        <CardHeader 
          title="Maximum Pool Capacity" 
          subtitle="Set the maximum number of guests allowed per time slot"
        />
        
        <div className="space-y-6">
          {/* Quick Set All */}
          <div className="p-4 bg-primary-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Quick Set All Slots</p>
                <p className="text-sm text-gray-600">Apply the same capacity to all time slots</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="quickSet"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_people_slot_1}
                  onChange={(e) => applyToAll(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">guests</span>
              </div>
            </div>
          </div>

          {/* Individual Slot Settings */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Slot 1: 8AM - 11AM */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Morning Slot</p>
                  <p className="text-sm text-gray-500">8:00 AM - 11:00 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="slot1"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_people_slot_1}
                  onChange={(e) => handleInputChange('max_people_slot_1', e.target.value)}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">max guests</span>
              </div>
            </div>

            {/* Slot 2: 11AM - 2PM */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Late Morning Slot</p>
                  <p className="text-sm text-gray-500">11:00 AM - 2:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="slot2"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_people_slot_2}
                  onChange={(e) => handleInputChange('max_people_slot_2', e.target.value)}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">max guests</span>
              </div>
            </div>

            {/* Slot 3: 2PM - 5PM */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Afternoon Slot</p>
                  <p className="text-sm text-gray-500">2:00 PM - 5:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="slot3"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_people_slot_3}
                  onChange={(e) => handleInputChange('max_people_slot_3', e.target.value)}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">max guests</span>
              </div>
            </div>

            {/* Slot 4: 5PM - 8PM */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-info-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Evening Slot</p>
                  <p className="text-sm text-gray-500">5:00 PM - 8:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="slot4"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_people_slot_4}
                  onChange={(e) => handleInputChange('max_people_slot_4', e.target.value)}
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">max guests</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="bg-gray-50">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">About Pool Capacity</h4>
            <p className="text-sm text-gray-600 mt-1">
              The maximum capacity setting limits how many guests can be allowed during each time slot. 
              When a renter makes a reservation, they can select up to this many guests for their booking.
              Adjust these values based on pool size, safety regulations, and staffing availability.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
