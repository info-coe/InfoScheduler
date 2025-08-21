import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, Square, Trash2, Settings, RefreshCw, Activity, Database, Mail, BarChart3, FileText, Folder } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

// API functions
const api = {
  getSchedulerStatus: () => fetch(`${API_BASE_URL}/scheduler/status`).then(res => res.json()),
  startScheduler: () => fetch(`${API_BASE_URL}/scheduler/start`, { method: 'POST' }).then(res => res.json()),
  pauseScheduler: () => fetch(`${API_BASE_URL}/scheduler/pause`, { method: 'POST' }).then(res => res.json()),
  resumeScheduler: () => fetch(`${API_BASE_URL}/scheduler/resume`, { method: 'POST' }).then(res => res.json()),
  shutdownScheduler: () => fetch(`${API_BASE_URL}/scheduler/shutdown`, { method: 'POST' }).then(res => res.json()),
  getJobs: () => fetch(`${API_BASE_URL}/jobs`).then(res => res.json()),
  createJob: (jobData) => fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData)
  }).then(res => res.json()),
  deleteJob: (jobId) => fetch(`${API_BASE_URL}/jobs/${jobId}`, { method: 'DELETE' }).then(res => res.json()),
  pauseJob: (jobId) => fetch(`${API_BASE_URL}/jobs/${jobId}/pause`, { method: 'POST' }).then(res => res.json()),
  resumeJob: (jobId) => fetch(`${API_BASE_URL}/jobs/${jobId}/resume`, { method: 'POST' }).then(res => res.json()),
  executeJob: (jobId) => fetch(`${API_BASE_URL}/jobs/${jobId}/execute`, { method: 'POST' }).then(res => res.json()),
  getJobResults: (jobId) => fetch(`${API_BASE_URL}/jobs/${jobId}/results`).then(res => res.json()),
  getFunctions: () => fetch(`${API_BASE_URL}/functions`).then(res => res.json())
};

// Components
const StatusBadge = ({ status, children }) => {
  const colors = {
    running: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    stopped: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800'
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {children}
    </span>
  );
};

const JobForm = ({ onJobCreated, availableFunctions }) => {
  const [formData, setFormData] = useState({
    name: '',
    func_name: '',
    custom_code: '',
    trigger_type: '',
    trigger_config: {},
    args: '',
    kwargs: '',
    max_instances: 1
  });

  const [triggerConfig, setTriggerConfig] = useState({
    interval: { seconds: 60 },
    cron: { hour: 9, minute: 0 },
    date: { run_date: '' }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const jobData = {
        ...formData,
        trigger_config: triggerConfig[formData.trigger_type] || {},
        args: formData.args ? JSON.parse(`[${formData.args}]`) : [],
        kwargs: formData.kwargs ? JSON.parse(formData.kwargs) : {}
      };
      
      if (formData.func_name === 'custom_code') {
        jobData.custom_code = formData.custom_code;
      }

      await api.createJob(jobData);
      onJobCreated();
      setFormData({
        name: '',
        func_name: '',
        custom_code: '',
        trigger_type: '',
        trigger_config: {},
        args: '',
        kwargs: '',
        max_instances: 1
      });
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Error creating job: ' + error.message);
    }
  };

  const getFunctionIcon = (funcName) => {
    const icons = {
      send_email: <Mail className="w-4 h-4" />,
      backup_database: <Database className="w-4 h-4" />,
      process_data: <BarChart3 className="w-4 h-4" />,
      sample_job: <Activity className="w-4 h-4" />,
      custom_code: <FileText className="w-4 h-4" />
    };
    return icons[funcName] || <Activity className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-600" />
        Schedule New Job
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Daily Email Report"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Function</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.func_name}
              onChange={(e) => setFormData({...formData, func_name: e.target.value})}>
              <option value="">Select Function</option>
              {availableFunctions.map(func => (
                <option key={func.name} value={func.name}>
                  {func.name.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.func_name === 'custom_code' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom Python Code</label>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              value={formData.custom_code}
              onChange={(e) => setFormData({...formData, custom_code: e.target.value})}
              placeholder="import datetime&#10;import json&#10;&#10;def my_function():&#10;    result = {'status': 'success', 'timestamp': datetime.datetime.now().isoformat()}&#10;    return result&#10;&#10;result = my_function()"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.trigger_type}
              onChange={(e) => setFormData({...formData, trigger_type: e.target.value})}>
              <option value="">Select Trigger</option>
              <option value="interval">Interval (Repeat every X seconds)</option>
              <option value="cron">Cron (Schedule at specific times)</option>
              <option value="date">Date (Run once at specific time)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Instances</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.max_instances}
              onChange={(e) => setFormData({...formData, max_instances: parseInt(e.target.value)})}
            />
          </div>
        </div>

        {/* Trigger Configuration */}
        {formData.trigger_type === 'interval' && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Interval Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-blue-800 mb-1">Seconds</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                  value={triggerConfig.interval.seconds}
                  onChange={(e) => setTriggerConfig({
                    ...triggerConfig,
                    interval: {...triggerConfig.interval, seconds: parseInt(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="block text-sm text-blue-800 mb-1">Minutes (optional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setTriggerConfig({
                    ...triggerConfig,
                    interval: {...triggerConfig.interval, minutes: parseInt(e.target.value) || undefined}
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {formData.trigger_type === 'cron' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Cron Configuration</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-green-800 mb-1">Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                  value={triggerConfig.cron.hour}
                  onChange={(e) => setTriggerConfig({
                    ...triggerConfig,
                    cron: {...triggerConfig.cron, hour: parseInt(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="block text-sm text-green-800 mb-1">Minute (0-59)</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                  value={triggerConfig.cron.minute}
                  onChange={(e) => setTriggerConfig({
                    ...triggerConfig,
                    cron: {...triggerConfig.cron, minute: parseInt(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="block text-sm text-green-800 mb-1">Day of Week</label>
                <select
                  className="w-full px-3 py-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500"
                  onChange={(e) => setTriggerConfig({
                    ...triggerConfig,
                    cron: {...triggerConfig.cron, day_of_week: e.target.value || undefined}
                  })}>
                  <option value="">Any day</option>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                  <option value="0-4">Weekdays</option>
                  <option value="5-6">Weekends</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {formData.trigger_type === 'date' && (
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Date Configuration</h4>
            <div>
              <label className="block text-sm text-purple-800 mb-1">Run Date & Time</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                onChange={(e) => setTriggerConfig({
                  ...triggerConfig,
                  date: {run_date: e.target.value}
                })}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arguments (comma-separated)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.args}
              onChange={(e) => setFormData({...formData, args: e.target.value})}
              placeholder="'Hello', 'World', 123"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keyword Arguments (JSON)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.kwargs}
              onChange={(e) => setFormData({...formData, kwargs: e.target.value})}
              placeholder='{"key": "value"}'
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2">
          <Play className="w-4 h-4" />
          Schedule Job
        </button>
      </form>
    </div>
  );
};

const JobCard = ({ job, onJobAction }) => {
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const fetchResults = async () => {
    try {
      const jobResults = await api.getJobResults(job.id);
      setResults(jobResults);
      setShowResults(!showResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const getStatusColor = () => {
    if (!job.next_run_time) return 'border-gray-300 bg-gray-50';
    if (job.pending) return 'border-yellow-300 bg-yellow-50';
    return 'border-green-300 bg-green-50';
  };

  const getFunctionIcon = (funcName) => {
    const icons = {
      send_email: <Mail className="w-5 h-5 text-blue-600" />,
      backup_database: <Database className="w-5 h-5 text-green-600" />,
      process_data: <BarChart3 className="w-5 h-5 text-purple-600" />,
      sample_job: <Activity className="w-5 h-5 text-orange-600" />,
      custom_code_executor: <FileText className="w-5 h-5 text-red-600" />
    };
    return icons[funcName] || <Activity className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className={`border-2 rounded-xl p-6 transition-all hover:shadow-lg ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getFunctionIcon(job.func_name)}
          <div>
            <h3 className="font-bold text-lg text-gray-900">{job.name}</h3>
            <p className="text-sm text-gray-600">{job.func_name.replace('_', ' ')}</p>
          </div>
        </div>
        
        <StatusBadge status={job.pending ? 'pending' : (job.next_run_time ? 'running' : 'stopped')}>
          {job.pending ? 'Pending' : (job.next_run_time ? 'Active' : 'Stopped')}
        </StatusBadge>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Next Run:</span>
          <span className="font-medium">
            {job.next_run_time ? new Date(job.next_run_time).toLocaleString() : 'Not scheduled'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Trigger:</span>
          <span className="font-medium">{job.trigger.split('[')[0]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Max Instances:</span>
          <span className="font-medium">{job.max_instances}</span>
        </div>
        {job.args && job.args.length > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Args:</span>
            <span className="font-medium text-xs">{JSON.stringify(job.args)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onJobAction('execute', job.id)}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1">
          <Play className="w-3 h-3" />
          Execute Now
        </button>
        
        <button
          onClick={() => onJobAction(job.next_run_time ? 'pause' : 'resume', job.id)}
          className={`px-3 py-1 rounded-lg transition-colors text-sm flex items-center gap-1 ${
            job.next_run_time 
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}>
          {job.next_run_time ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {job.next_run_time ? 'Pause' : 'Resume'}
        </button>
        
        <button
          onClick={fetchResults}
          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          Results
        </button>
        
        <button
          onClick={() => onJobAction('delete', job.id)}
          className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-1">
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>

      {showResults && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Execution Results</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {results.length === 0 ? (
              <p className="text-gray-500 text-sm">No execution results yet</p>
            ) : (
              results.slice(-5).reverse().map((result, index) => (
                <div key={index} className={`p-2 rounded text-xs ${
                  result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{result.status.toUpperCase()}</span>
                    <span>{new Date(result.execution_time).toLocaleString()}</span>
                  </div>
                  {result.result && (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result.result, null, 2)}</pre>
                  )}
                  {result.error && (
                    <div className="text-red-700">{result.error}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SchedulerControls = ({ status, onAction }) => {
  const getStatusColor = () => {
    if (!status) return 'bg-gray-100 text-gray-800';
    if (status.running) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5 text-blue-600" />
        Scheduler Control
      </h2>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <StatusBadge status={status?.running ? 'running' : 'stopped'}>
            {status?.running ? 'RUNNING' : 'STOPPED'}
          </StatusBadge>
        </div>
        
        {status && (
          <div className="text-sm text-gray-600 space-y-1">
            <div>Jobs: {status.jobs_count}</div>
            <div>State: {status.state}</div>
            {status.next_wakeup && (
              <div>Next Wakeup: {new Date(status.next_wakeup).toLocaleString()}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction('start')}
          disabled={status?.running}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          <Play className="w-4 h-4" />
          Start
        </button>
        
        <button
          onClick={() => onAction('pause')}
          disabled={!status?.running}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          <Pause className="w-4 h-4" />
          Pause
        </button>
        
        <button
          onClick={() => onAction('resume')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Resume
        </button>
        
        <button
          onClick={() => onAction('shutdown')}
          disabled={!status?.running}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
          <Square className="w-4 h-4" />
          Shutdown
        </button>
      </div>
    </div>
  );
};

// Main App Component
const APSchedulerApp = () => {
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [availableFunctions, setAvailableFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, jobsRes, functionsRes] = await Promise.all([
        api.getSchedulerStatus(),
        api.getJobs(),
        api.getFunctions()
      ]);
      
      setSchedulerStatus(statusRes);
      setJobs(jobsRes);
      setAvailableFunctions(functionsRes.functions || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error connecting to scheduler API. Make sure the backend is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulerAction = async (action) => {
    try {
      let response;
      switch (action) {
        case 'start':
          response = await api.startScheduler();
          break;
        case 'pause':
          response = await api.pauseScheduler();
          break;
        case 'resume':
          response = await api.resumeScheduler();
          break;
        case 'shutdown':
          response = await api.shutdownScheduler();
          break;
        default:
          return;
      }
      
      showNotification(response.message || `Scheduler ${action}ed successfully`);
      await fetchData();
    } catch (error) {
      console.error(`Error ${action}ing scheduler:`, error);
      showNotification(`Error ${action}ing scheduler`, 'error');
    }
  };

  const handleJobAction = async (action, jobId) => {
    try {
      let response;
      switch (action) {
        case 'execute':
          response = await api.executeJob(jobId);
          showNotification(`Job executed: ${response.result?.message || 'Success'}`);
          break;
        case 'pause':
          response = await api.pauseJob(jobId);
          showNotification(response.message);
          break;
        case 'resume':
          response = await api.resumeJob(jobId);
          showNotification(response.message);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this job?')) {
            response = await api.deleteJob(jobId);
            showNotification(response.message);
          }
          break;
        default:
          return;
      }
      
      await fetchData();
    } catch (error) {
      console.error(`Error ${action}ing job:`, error);
      showNotification(`Error ${action}ing job`, 'error');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading APScheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 APScheduler Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Advanced Python Scheduler Management Interface
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{jobs.length}</div>
            <div className="text-gray-600">Total Jobs</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {jobs.filter(job => job.next_run_time).length}
            </div>
            <div className="text-gray-600">Active Jobs</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {jobs.filter(job => job.pending).length}
            </div>
            <div className="text-gray-600">Pending Jobs</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {availableFunctions.length}
            </div>
            <div className="text-gray-600">Functions</div>
          </div>
        </div>

        {/* Controls and Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <SchedulerControls 
            status={schedulerStatus} 
            onAction={handleSchedulerAction} 
          />
          <div className="lg:col-span-2">
            <JobForm 
              onJobCreated={fetchData} 
              availableFunctions={availableFunctions} 
            />
          </div>
        </div>

        {/* Jobs List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Scheduled Jobs</h2>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Jobs Scheduled</h3>
              <p className="text-gray-600">Create your first job using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {jobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  onJobAction={handleJobAction} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>APScheduler FastAPI Backend + React Frontend</p>
          <p className="text-sm">Backend running on http://localhost:8000</p>
        </div>
      </div>
    </div>
  );
};

export default APSchedulerApp;