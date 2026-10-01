import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'system', name: 'System', icon: '⚙️' },
    { id: 'risk', name: 'Risk Thresholds', icon: '⚠️' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-muted">Configure system settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-electric-blue/20 text-electric-blue'
                    : 'text-muted hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass-card">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Profile Settings</h3>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-electric-blue flex items-center justify-center text-3xl font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{user?.username}</h4>
                  <p className="text-muted">{user?.email}</p>
                  <p className="text-sm text-muted">Role: {user?.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Username</span>
                  </label>
                  <input
                    type="text"
                    defaultValue={user?.username}
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Email</span>
                  </label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Current Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">New Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Configuration</h3>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Company Name</span>
                  </label>
                  <input
                    type="text"
                    defaultValue="FleetAI Transportation"
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Timezone</span>
                  </label>
                  <select className="select select-bordered bg-navy-blue border-white/20 text-white">
                    <option>Asia/Kolkata (IST)</option>
                    <option>UTC</option>
                    <option>America/New_York (EST)</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Date Format</span>
                  </label>
                  <select className="select select-bordered bg-navy-blue border-white/20 text-white">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">Enable Dark Mode</span>
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  </label>
                </div>

                <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Risk Thresholds</h3>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">High Risk Threshold (%)</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    defaultValue="70"
                    className="range range-primary"
                  />
                  <div className="flex justify-between text-xs text-muted">
                    <span>50%</span>
                    <span>70%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Medium Risk Threshold (%)</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="70"
                    defaultValue="50"
                    className="range range-primary"
                  />
                  <div className="flex justify-between text-xs text-muted">
                    <span>30%</span>
                    <span>50%</span>
                    <span>70%</span>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Speed Limit (km/h)</span>
                  </label>
                  <input
                    type="number"
                    defaultValue="80"
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-white">Harsh Braking Threshold (m/s²)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    defaultValue="3.0"
                    className="input input-bordered bg-navy-blue border-white/20 text-white"
                  />
                </div>

                <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
                  Save Thresholds
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">High Risk Alerts</span>
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">Fuel Efficiency Alerts</span>
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">Vehicle Offline Alerts</span>
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">Harsh Event Notifications</span>
                    <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">Email Notifications</span>
                    <input type="checkbox" className="checkbox checkbox-primary" />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text text-white">SMS Notifications</span>
                    <input type="checkbox" className="checkbox checkbox-primary" />
                  </label>
                </div>

                <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
