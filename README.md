# APScheduler FastAPI Backend + React Frontend

## 🚀 **FastAPI Backend Features**

### **Core APScheduler Integration**
- **AsyncIOScheduler** with proper application lifecycle management
- **Multiple Job Stores** support (Memory, SQLite, Redis, MongoDB configurable)
- **Thread Pool Executors** with configurable max workers
- **Job Event Listeners** for execution tracking and result storage
- **Timezone Support** with configurable timezone settings
- **Graceful Startup/Shutdown** with proper resource cleanup

### **Scheduler Management API**
- **GET /scheduler/status** - Real-time scheduler status, job counts, next wakeup time
- **POST /scheduler/start** - Start the scheduler if stopped
- **POST /scheduler/pause** - Pause job execution while keeping scheduler running
- **POST /scheduler/resume** - Resume paused scheduler
- **POST /scheduler/shutdown** - Gracefully shutdown scheduler
- **POST /scheduler/configure** - Update scheduler configuration

### **Job Management API**
- **GET /jobs** - List all scheduled jobs with details
- **POST /jobs** - Create new job with flexible trigger configuration
- **GET /jobs/{job_id}** - Get specific job details
- **PUT /jobs/{job_id}** - Update existing job parameters
- **DELETE /jobs/{job_id}** - Remove job and cleanup results
- **POST /jobs/{job_id}/pause** - Pause specific job
- **POST /jobs/{job_id}/resume** - Resume paused job
- **POST /jobs/{job_id}/execute** - Execute job immediately (manual trigger)
- **GET /jobs/{job_id}/results** - View job execution history and results

### **Trigger Types Support**
- **Interval Triggers** - Run jobs every X seconds/minutes/hours
- **Cron Triggers** - Complex scheduling (daily, weekly, specific times)
- **Date Triggers** - One-time execution at specific date/time
- **Advanced Configuration** - Misfire handling, max instances, grace time

### **Built-in Job Functions**
- **send_email()** - Email sending simulation with recipient, subject, body
- **backup_database()** - Database backup simulation with size and location tracking
- **process_data()** - Data processing simulation with record counts and timing
- **sample_job()** - Basic demonstration job with customizable message
- **custom_code_executor()** - Safe execution of custom Python code with restricted environment

### **Security & Safety**
- **Restricted Code Execution** - Limited builtins for custom code safety
- **Error Handling** - Comprehensive exception catching and logging
- **Input Validation** - Pydantic models for API request validation
- **CORS Support** - Configurable cross-origin resource sharing

### **Monitoring & Logging**
- **Execution Results Storage** - Last 50 results per job with status, duration, output
- **Real-time Job Tracking** - Pending, active, completed job states
- **Error Logging** - Detailed error messages and tracebacks
- **Performance Metrics** - Execution duration and success/failure rates

## 🎨 **React Frontend Features**

### **Dashboard Overview**
- **Real-time Statistics Cards** - Total jobs, active jobs, pending jobs, available functions
- **Scheduler Status Display** - Running/stopped state with visual indicators
- **Auto-refresh Functionality** - Updates every 10 seconds automatically
- **Responsive Design** - Mobile-friendly layout with Tailwind CSS

### **Scheduler Control Panel**
- **Start/Stop Controls** - One-click scheduler management
- **Pause/Resume Functionality** - Temporary job execution control
- **Status Monitoring** - Real-time state display with color coding
- **Configuration Display** - Current settings and job counts

### **Advanced Job Creation Form**
- **Function Selection** - Dropdown with all available job functions
- **Custom Python Code Editor** - Textarea for writing custom execution code
- **Trigger Configuration** - Dynamic form fields based on trigger type
- **Argument Support** - JSON input for function arguments and keyword arguments
- **Validation** - Form validation with error handling

### **Trigger Configuration Options**

#### **Interval Triggers**
- **Seconds/Minutes Input** - Flexible interval configuration
- **Visual Configuration** - Blue-themed form section
- **Real-time Preview** - Shows next execution time

#### **Cron Triggers**
- **Hour/Minute Selection** - Time-based scheduling
- **Day of Week Options** - Weekdays, weekends, specific days
- **Green-themed Interface** - Easy visual distinction

#### **Date Triggers**
- **DateTime Picker** - One-time execution scheduling
- **Purple-themed Design** - Visual consistency
- **Timezone Awareness** - Respects scheduler timezone

### **Job Management Cards**
- **Visual Status Indicators** - Color-coded borders and badges
- **Function Icons** - Unique icons for different job types
- **Next Run Time Display** - Human-readable scheduling information
- **Job Details** - Trigger type, max instances, arguments display

### **Job Action Controls**
- **Execute Now** - Immediate manual job execution
- **Pause/Resume** - Individual job control
- **Results Viewer** - Expandable execution history
- **Delete Function** - Safe job removal with confirmation

### **Execution Results Display**
- **Success/Error Status** - Color-coded result indicators
- **JSON Result Formatting** - Pretty-printed execution outputs
- **Timestamp Tracking** - Execution time logging
- **Error Details** - Full error messages and tracebacks
- **Result History** - Last 5 executions per job

### **User Experience Features**
- **Toast Notifications** - Success/error message display
- **Loading States** - Spinner indicators during API calls
- **Confirmation Dialogs** - Safe deletion with user confirmation
- **Error Handling** - Graceful API error management
- **Accessibility** - Proper ARIA labels and keyboard navigation

## 🛠 **Setup & Configuration**

### **Backend Setup**
```bash
# Install dependencies
pip install fastapi uvicorn apscheduler python-multipart

# Run development server
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **Environment Configuration**
- **Default Port** - 8000
- **CORS Settings** - All origins allowed for development
- **Logging Level** - INFO level with detailed scheduler logs
- **Job Store** - Memory store (configurable to SQLite/Redis/MongoDB)

### **API Integration**
- **Base URL** - `http://localhost:8000`
- **Content Type** - JSON for all POST/PUT requests
- **Error Handling** - HTTP status codes with detailed error messages
- **Documentation** - Auto-generated OpenAPI/Swagger docs at `/docs`

## 🎯 **Use Cases**

### **Development & Testing**
- **Job Prototyping** - Test scheduling logic before production
- **Code Debugging** - Execute custom Python code safely
- **Performance Testing** - Monitor job execution times and success rates

### **System Administration**
- **Automated Backups** - Schedule database and file backups
- **Data Processing** - Batch data processing and ETL jobs
- **Maintenance Tasks** - System cleanup and optimization jobs

### **Business Applications**
- **Report Generation** - Scheduled business reports
- **Email Notifications** - Automated notification systems
- **Data Synchronization** - API data syncing and integration

### **Monitoring & Operations**
- **Health Checks** - System monitoring and alerting
- **Log Processing** - Automated log analysis and cleanup
- **Performance Metrics** - System performance data collection

## 🔧 **Technical Architecture**

### **Backend Architecture**
- **Async/Await Pattern** - Full asyncio support for concurrent execution
- **Dependency Injection** - FastAPI's built-in dependency system
- **Lifecycle Management** - Proper startup/shutdown hooks
- **Error Boundaries** - Comprehensive exception handling

### **Frontend Architecture**
- **React Hooks** - Modern functional component approach
- **State Management** - useState and useEffect for local state
- **Component Composition** - Reusable UI components
- **Event Handling** - Async/await for API calls

### **Integration Layer**
- **REST API** - Standard HTTP methods for all operations
- **JSON Communication** - Structured data exchange
- **Real-time Updates** - Polling-based live data updates
- **Error Propagation** - Consistent error handling across layers

This comprehensive APScheduler management system provides a complete solution for job scheduling, monitoring, and management with both programmatic API access and an intuitive web interface.
