import React, { useState, useEffect } from 'react';
import { fetchPoolSettings, updatePoolSettings } from '../../api/reservationApi';

// Initial state structure matching the database columns
const initialSettings = {
    max_people_slot_1: '',
    max_people_slot_2: '',
    max_people_slot_3: '',
    max_people_slot_4: '',
};

const PoolSettings = () => {
    const [settings, setSettings] = useState(initialSettings);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchPoolSettings();

                // Convert numerical DB values → strings for inputs
                const formatted = {
                    max_people_slot_1: String(data.max_people_slot_1 || ''),
                    max_people_slot_2: String(data.max_people_slot_2 || ''),
                    max_people_slot_3: String(data.max_people_slot_3 || ''),
                    max_people_slot_4: String(data.max_people_slot_4 || '')
                };

                setSettings(formatted);

            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Failed to load pool settings. Please ensure database is initialized.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    // ✔ Allow empty input, do NOT convert to 0 here
    const handleChange = (e) => {
        const { name, value } = e.target;

        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        // ✔ Validate only on submit
        const isValid = Object.values(settings).every(val => {
            const num = Number(val);
            return Number.isInteger(num) && num > 0;
        });

        if (!isValid) {
            setError('All capacity slots must be greater than zero and contain valid numbers.');
            setIsSaving(false);
            return;
        }

        try {
            // ✔ Convert strings → integers before sending
            const payload = {
                max_people_slot_1: Number(settings.max_people_slot_1),
                max_people_slot_2: Number(settings.max_people_slot_2),
                max_people_slot_3: Number(settings.max_people_slot_3),
                max_people_slot_4: Number(settings.max_people_slot_4),
            };

            await updatePoolSettings(payload);
            setSuccessMessage('Settings updated and logged successfully!');
            setTimeout(() => setSuccessMessage(null), 4000);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <h3>Loading Pool Settings...</h3>;

    if (error && !successMessage)
        return <h3 className="error-message">Error: {error}</h3>;

    return (
        <div className="pool-settings">
            <h3>Pool Capacity Settings</h3>
            <p className="note">
                Adjust the maximum number of people allowed per corresponding pool time slot.
            </p>

            {successMessage && <p className="success-message">{successMessage}</p>}
            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit} className="settings-form">
                
                <div className="form-group">
                    <label htmlFor="slot1">Max People - Slot 1 (e.g., 08:00-09:00)</label>
                    <input
                        type="number"
                        id="slot1"
                        name="max_people_slot_1"
                        value={settings.max_people_slot_1}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="slot2">Max People - Slot 2 (e.g., 09:00-10:00)</label>
                    <input
                        type="number"
                        id="slot2"
                        name="max_people_slot_2"
                        value={settings.max_people_slot_2}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="slot3">Max People - Slot 3 (e.g., 10:00-11:00)</label>
                    <input
                        type="number"
                        id="slot3"
                        name="max_people_slot_3"
                        value={settings.max_people_slot_3}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="slot4">Max People - Slot 4 (e.g., 11:00-12:00)</label>
                    <input
                        type="number"
                        id="slot4"
                        name="max_people_slot_4"
                        value={settings.max_people_slot_4}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={isSaving}
                    />
                </div>

                <button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
};

export default PoolSettings;
