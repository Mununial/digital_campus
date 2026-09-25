import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  Settings, 
  Save, 
  PhoneCall, 
  Languages, 
  RotateCcw, 
  Timer,
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const VoiceSettings = () => {
  const [settings, setSettings] = useState({
    providerName: 'EXOTEL',
    voiceLanguage: 'en-IN',
    retryEnabled: true,
    max_retries: 3,
    callTimeoutSeconds: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/calls/settings');
      if (res.data) {
        setSettings({
          providerName: res.data.provider_name,
          voiceLanguage: res.data.voice_language,
          retryEnabled: res.data.retry_enabled,
          max_retries: res.data.max_retries,
          callTimeoutSeconds: res.data.call_timeout_seconds
        });
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/calls/settings', settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Voice Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Call Configuration">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Section: Provider */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-secondary/5 shadow-sm space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Smartphone size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-secondary-900">Telephony Provider</h3>
                <p className="text-xs font-bold text-secondary/40">Select and configure your outbound call gateway.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Active Provider</label>
                <select 
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 appearance-none"
                  value={settings.providerName}
                  onChange={(e) => setSettings({...settings, providerName: e.target.value})}
                >
                  <option value="EXOTEL">Exotel (Recommended)</option>
                  <option value="TWILIO">Twilio</option>
                  <option value="GUPSHUP">Gupshup</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">AI Voice Language</label>
                <div className="relative">
                  <Languages size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30" />
                  <select 
                    className="w-full pl-12 pr-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 appearance-none"
                    value={settings.voiceLanguage}
                    onChange={(e) => setSettings({...settings, voiceLanguage: e.target.value})}
                  >
                    <option value="en-IN">English (India)</option>
                    <option value="hi-IN">Hindi (India)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Retry Logic */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-secondary/5 shadow-sm space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-secondary-900">Retry & Reliability</h3>
                <p className="text-xs font-bold text-secondary/40">Define how the system handles missed or failed calls.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-6 bg-secondary/5 rounded-3xl col-span-1">
                <span className="text-sm font-black text-secondary-900">Auto-Retry</span>
                <button 
                  type="button"
                  onClick={() => setSettings({...settings, retryEnabled: !settings.retryEnabled})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.retryEnabled ? 'bg-primary' : 'bg-secondary/20'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.retryEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <div className="space-y-2 col-span-1">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Max Retries</label>
                <input 
                  type="number"
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10"
                  value={settings.max_retries}
                  onChange={(e) => setSettings({...settings, max_retries: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Call Timeout (sec)</label>
                <div className="relative">
                  <Timer size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30" />
                  <input 
                    type="number"
                    className="w-full pl-12 pr-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10"
                    value={settings.callTimeoutSeconds}
                    onChange={(e) => setSettings({...settings, callTimeoutSeconds: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Safety & AI Compliance */}
          <div className="bg-success/5 rounded-[2.5rem] p-8 border border-success/20 flex items-start gap-6">
            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-success uppercase tracking-wider">AI Compliance Active</h4>
              <p className="text-xs font-bold text-success/70 leading-relaxed">
                Your calls will automatically include an AI disclosure. Transcripts are stored securely and end-to-end encrypted.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button 
              type="button"
              className="px-8 py-4 bg-white border border-secondary/10 rounded-2xl font-black text-xs uppercase tracking-widest text-secondary/40 hover:bg-secondary/5 transition-all"
            >
              Reset Defaults
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="px-12 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/25 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default VoiceSettings;
