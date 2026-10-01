import { useState } from 'react';

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('fleet');

  const reportTypes = [
    { id: 'fleet', name: 'Fleet Performance', icon: '🚛' },
    { id: 'driver', name: 'Driver Performance', icon: '👨‍✈️' },
    { id: 'fuel', name: 'Fuel Report', icon: '⛽' },
    { id: 'risk', name: 'Risk Analysis', icon: '⚠️' },
    { id: 'journey', name: 'Journey Report', icon: '📍' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
        <p className="text-muted">Generate and view fleet performance reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`p-4 rounded-lg border transition-all ${
                selectedReport === type.id
                  ? 'bg-electric-blue/20 border-electric-blue text-electric-blue'
                  : 'bg-white/5 border-white/10 text-muted hover:bg-white/10'
              }`}
            >
              <div className="text-3xl mb-2">{type.icon}</div>
              <div className="font-medium">{type.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Filters */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Start Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered bg-navy-blue border-white/20 text-white"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">End Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered bg-navy-blue border-white/20 text-white"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Vehicle</span>
            </label>
            <select className="select select-bordered bg-navy-blue border-white/20 text-white">
              <option>All Vehicles</option>
              <option>VH-001</option>
              <option>VH-002</option>
              <option>VH-003</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-white">Driver</span>
            </label>
            <select className="select select-bordered bg-navy-blue border-white/20 text-white">
              <option>All Drivers</option>
              <option>DR-001</option>
              <option>DR-002</option>
              <option>DR-003</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <button className="btn btn-primary bg-electric-blue hover:bg-electric-blue/80 border-none">
            Generate Report
          </button>
          <button className="btn btn-outline border-white/20 text-white hover:bg-white/10">
            Export PDF
          </button>
          <button className="btn btn-outline border-white/20 text-white hover:bg-white/10">
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="glass-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            {reportTypes.find(r => r.id === selectedReport)?.name} Report
          </h3>
          <button className="btn btn-sm btn-ghost text-electric-blue hover:bg-electric-blue/20">
            Print Report
          </button>
        </div>
        
        <div className="bg-white/5 rounded-lg p-6 min-h-[400px]">
          <div className="text-center text-muted">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg">Select filters and click "Generate Report" to view the report</p>
            <p className="text-sm mt-2">Reports will include detailed analytics, charts, and performance metrics</p>
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div className="glass-card">
        <h3 className="text-xl font-semibold text-white mb-4">Saved Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📋</span>
              <span className="font-medium text-white">Monthly Fleet Summary</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-15</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">👨‍✈️</span>
              <span className="font-medium text-white">Driver Performance Q4</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-10</p>
          </div>
          <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⛽</span>
              <span className="font-medium text-white">Fuel Analysis January</span>
            </div>
            <p className="text-sm text-muted">Generated on: 2024-01-05</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
