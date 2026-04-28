import { Server, Database, Cpu, HardDrive, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function SystemHealth() {
  const queueData = [
    { time: '14:00', high: 120, standard: 1200, low: 2400, webhooks: 450 },
    { time: '14:15', high: 145, standard: 1350, low: 2600, webhooks: 520 },
    { time: '14:30', high: 98, standard: 1150, low: 2200, webhooks: 380 },
    { time: '14:45', high: 210, standard: 1680, low: 3100, webhooks: 670 },
    { time: '15:00', high: 167, standard: 1420, low: 2750, webhooks: 510 },
  ];

  const latencyData = [
    { time: '14:00', meta: 145, db: 23, cache: 5 },
    { time: '14:15', meta: 132, db: 28, cache: 4 },
    { time: '14:30', meta: 178, db: 19, cache: 6 },
    { time: '14:45', meta: 156, db: 31, cache: 5 },
    { time: '15:00', meta: 149, db: 25, cache: 4 },
  ];

  const workers = [
    {
      id: 1,
      name: 'message-worker-01',
      status: 'healthy',
      queue: 'High Priority',
      jobsProcessed: 45230,
      jobsInQueue: 145,
      cpu: 42,
      memory: 68,
      uptime: '15d 8h 23m',
    },
    {
      id: 2,
      name: 'message-worker-02',
      status: 'healthy',
      queue: 'Standard',
      jobsProcessed: 123450,
      jobsInQueue: 1420,
      cpu: 56,
      memory: 72,
      uptime: '15d 8h 23m',
    },
    {
      id: 3,
      name: 'message-worker-03',
      status: 'warning',
      queue: 'Low Priority',
      jobsProcessed: 89120,
      jobsInQueue: 2750,
      cpu: 78,
      memory: 89,
      uptime: '12d 4h 15m',
    },
    {
      id: 4,
      name: 'webhook-worker-01',
      status: 'healthy',
      queue: 'Webhooks',
      jobsProcessed: 34560,
      jobsInQueue: 510,
      cpu: 38,
      memory: 54,
      uptime: '15d 8h 23m',
    },
  ];

  const databases = [
    {
      name: 'Primary PostgreSQL',
      status: 'healthy',
      connections: 87,
      maxConnections: 200,
      replicationLag: '0ms',
      diskUsage: 67,
    },
    {
      name: 'Read Replica 1',
      status: 'healthy',
      connections: 143,
      maxConnections: 200,
      replicationLag: '12ms',
      diskUsage: 67,
    },
    {
      name: 'Redis Cache',
      status: 'healthy',
      connections: 245,
      maxConnections: 1000,
      hitRate: '98.7%',
      memoryUsage: 42,
    },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">System Health</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Monitor system infrastructure, queues, workers, and Meta API performance
        </p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">System Status</p>
          <p className="text-xl text-green-600">All Systems Operational</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Uptime</p>
          <p className="text-xl text-slate-900 dark:text-white">99.97%</p>
          <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Avg CPU Usage</p>
          <p className="text-xl text-slate-900 dark:text-white">53%</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Disk Usage</p>
          <p className="text-xl text-slate-900 dark:text-white">67%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Queue Health Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">Queue Health (Jobs in Queue)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={queueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="high" fill="#ef4444" name="High Priority" />
              <Bar dataKey="standard" fill="#3b82f6" name="Standard" />
              <Bar dataKey="low" fill="#10b981" name="Low Priority" />
              <Bar dataKey="webhooks" fill="#8b5cf6" name="Webhooks" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* API Latency Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
          <h3 className="text-slate-900 dark:text-white mb-6">API Latency (ms)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Line type="monotone" dataKey="meta" stroke="#10b981" strokeWidth={2} name="Meta API" />
              <Line type="monotone" dataKey="db" stroke="#3b82f6" strokeWidth={2} name="Database" />
              <Line type="monotone" dataKey="cache" stroke="#8b5cf6" strokeWidth={2} name="Cache" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workers Status */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 mb-8">
        <h3 className="text-slate-900 dark:text-white mb-6">Worker Processes</h3>
        <div className="space-y-4">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    worker.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <h4 className="text-sm text-slate-900 dark:text-white">{worker.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{worker.queue}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">Uptime: {worker.uptime}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Jobs Processed</p>
                  <p className="text-sm text-slate-900 dark:text-white">{worker.jobsProcessed.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Jobs in Queue</p>
                  <p className="text-sm text-slate-900 dark:text-white">{worker.jobsInQueue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">CPU Usage</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          worker.cpu > 80 ? 'bg-red-500' : worker.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${worker.cpu}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 w-8">{worker.cpu}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Memory Usage</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          worker.memory > 80 ? 'bg-red-500' : worker.memory > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${worker.memory}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 w-8">{worker.memory}%</span>
                  </div>
                </div>
              </div>

              {worker.status === 'warning' && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    High resource usage detected. Consider scaling this worker.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Database Status */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-6">Database & Cache</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {databases.map((db) => (
            <div
              key={db.name}
              className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm text-slate-900 dark:text-white">{db.name}</h4>
                <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Connections</span>
                    <span className="text-slate-900 dark:text-white">
                      {db.connections}/{db.maxConnections}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${(db.connections / db.maxConnections) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {db.replicationLag && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Replication Lag</span>
                    <span className="text-slate-900 dark:text-white">{db.replicationLag}</span>
                  </div>
                )}
                {db.hitRate && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Hit Rate</span>
                    <span className="text-green-600">{db.hitRate}</span>
                  </div>
                )}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      {db.diskUsage ? 'Disk Usage' : 'Memory Usage'}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {db.diskUsage || db.memoryUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${db.diskUsage || db.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
