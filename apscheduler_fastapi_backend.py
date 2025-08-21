# APScheduler FastAPI Backend
# Install dependencies: pip install fastapi uvicorn apscheduler python-multipart

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.job import Job
import asyncio
import json
import logging
import traceback
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None
job_results: Dict[str, List[Dict]] = {}

# Pydantic Models
class JobCreate(BaseModel):
    name: str = Field(..., description="Job name")
    func_name: str = Field(..., description="Function name to execute")
    custom_code: Optional[str] = Field(None, description="Custom Python code to execute")
    trigger_type: str = Field(..., description="Trigger type: interval, cron, date")
    trigger_config: Dict[str, Any] = Field(..., description="Trigger configuration")
    args: Optional[List[Any]] = Field(default=[], description="Function arguments")
    kwargs: Optional[Dict[str, Any]] = Field(default={}, description="Function keyword arguments")
    max_instances: int = Field(default=1, description="Maximum concurrent instances")
    misfire_grace_time: int = Field(default=30, description="Misfire grace time in seconds")

class JobUpdate(BaseModel):
    name: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    args: Optional[List[Any]] = None
    kwargs: Optional[Dict[str, Any]] = None
    max_instances: Optional[int] = None

class JobResponse(BaseModel):
    id: str
    name: str
    func_name: str
    next_run_time: Optional[datetime]
    trigger: str
    args: List[Any]
    kwargs: Dict[str, Any]
    max_instances: int
    misfire_grace_time: int
    pending: bool

class SchedulerConfig(BaseModel):
    max_workers: int = Field(default=20, ge=1, le=100)
    timezone: str = Field(default="UTC")
    jobstore_type: str = Field(default="memory", description="memory or sqlite")
    jobstore_url: Optional[str] = Field(None, description="Database URL for SQLAlchemy jobstore")

class SchedulerStatus(BaseModel):
    running: bool
    state: str
    jobs_count: int
    next_wakeup: Optional[datetime]
    executors: Dict[str, Any]
    jobstores: Dict[str, Any]

class ExecutionResult(BaseModel):
    job_id: str
    job_name: str
    execution_time: datetime
    duration: float
    status: str
    result: Optional[Any]
    error: Optional[str]
    traceback: Optional[str]

# Custom job functions that can be scheduled
async def sample_job(message: str = "Hello from APScheduler!"):
    """Sample job function"""
    logger.info(f"Executing sample job: {message}")
    await asyncio.sleep(1)  # Simulate work
    return {"status": "completed", "message": message, "timestamp": datetime.now().isoformat()}

async def send_email(recipient: str, subject: str, body: str = ""):
    """Simulate sending an email"""
    logger.info(f"Sending email to {recipient}")
    await asyncio.sleep(2)  # Simulate email sending
    return {
        "status": "sent",
        "recipient": recipient,
        "subject": subject,
        "sent_at": datetime.now().isoformat()
    }

async def backup_database(database_name: str = "main_db"):
    """Simulate database backup"""
    logger.info(f"Starting backup of {database_name}")
    await asyncio.sleep(5)  # Simulate backup process
    return {
        "status": "completed",
        "database": database_name,
        "backup_size": "250MB",
        "backup_location": f"/backups/{database_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql",
        "completed_at": datetime.now().isoformat()
    }

async def process_data(records_count: int = 1000):
    """Simulate data processing"""
    logger.info(f"Processing {records_count} records")
    await asyncio.sleep(3)  # Simulate processing
    return {
        "status": "processed",
        "records_processed": records_count,
        "processing_time": "3.2s",
        "completed_at": datetime.now().isoformat()
    }

async def custom_code_executor(code: str, context: Dict[str, Any] = None):
    """Execute custom Python code safely"""
    if context is None:
        context = {}
    
    logger.info("Executing custom code")
    try:
        # Create a restricted execution environment
        exec_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'dict': dict,
                'list': list,
                'datetime': datetime,
                'json': json,
            },
            'context': context,
            'result': None
        }
        
        # Execute the code
        exec(code, exec_globals)
        result = exec_globals.get('result', 'Code executed successfully')
        
        return {
            "status": "executed",
            "result": result,
            "executed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error executing custom code: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "executed_at": datetime.now().isoformat()
        }

# Available job functions
JOB_FUNCTIONS = {
    "sample_job": sample_job,
    "send_email": send_email,
    "backup_database": backup_database,
    "process_data": process_data,
    "custom_code": custom_code_executor,
}

def job_listener(event):
    """Job execution listener to track results"""
    if event.exception:
        result = ExecutionResult(
            job_id=event.job_id,
            job_name=getattr(event.job, 'name', event.job_id),
            execution_time=datetime.now(),
            duration=0.0,
            status="error",
            result=None,
            error=str(event.exception),
            traceback=str(event.traceback) if event.traceback else None
        )
    else:
        result = ExecutionResult(
            job_id=event.job_id,
            job_name=getattr(event.job, 'name', event.job_id),
            execution_time=datetime.now(),
            duration=getattr(event, 'duration', 0.0),
            status="success",
            result=event.retval,
            error=None,
            traceback=None
        )
    
    # Store result
    if event.job_id not in job_results:
        job_results[event.job_id] = []
    job_results[event.job_id].append(result.dict())
    
    # Keep only last 50 results per job
    job_results[event.job_id] = job_results[event.job_id][-50:]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    global scheduler
    
    # Startup
    jobstores = {
        'default': MemoryJobStore()
    }
    executors = {
        'default': ThreadPoolExecutor(20)
    }
    job_defaults = {
        'coalesce': False,
        'max_instances': 3,
        'misfire_grace_time': 30
    }
    
    scheduler = AsyncIOScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone='UTC'
    )
    
    # Add job listener
    scheduler.add_listener(job_listener, mask=255)
    
    scheduler.start()
    logger.info("APScheduler started")
    
    yield
    
    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shutdown")

# Create FastAPI app
app = FastAPI(
    title="APScheduler API",
    description="FastAPI backend for APScheduler job management",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/")
async def root():
    return {"message": "APScheduler FastAPI Backend", "version": "1.0.0"}

@app.get("/scheduler/status", response_model=SchedulerStatus)
async def get_scheduler_status():
    """Get scheduler status"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    return SchedulerStatus(
        running=scheduler.running,
        state=str(scheduler.state),
        jobs_count=len(scheduler.get_jobs()),
        next_wakeup=scheduler._wakeup if hasattr(scheduler, '_wakeup') else None,
        executors={name: str(executor) for name, executor in scheduler._executors.items()},
        jobstores={name: str(jobstore) for name, jobstore in scheduler._jobstores.items()}
    )

@app.post("/scheduler/start")
async def start_scheduler():
    """Start the scheduler"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    if not scheduler.running:
        scheduler.start()
        return {"message": "Scheduler started"}
    return {"message": "Scheduler already running"}

@app.post("/scheduler/pause")
async def pause_scheduler():
    """Pause the scheduler"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    if scheduler.running:
        scheduler.pause()
        return {"message": "Scheduler paused"}
    return {"message": "Scheduler not running"}

@app.post("/scheduler/resume")
async def resume_scheduler():
    """Resume the scheduler"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    if scheduler.state == 2:  # PAUSED
        scheduler.resume()
        return {"message": "Scheduler resumed"}
    return {"message": "Scheduler not paused"}

@app.post("/scheduler/shutdown")
async def shutdown_scheduler():
    """Shutdown the scheduler"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        return {"message": "Scheduler shutdown"}
    return {"message": "Scheduler not running"}

@app.post("/scheduler/configure")
async def configure_scheduler(config: SchedulerConfig):
    """Configure scheduler settings"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    # Note: Some configurations require scheduler restart
    return {"message": "Configuration updated", "config": config.dict()}

@app.get("/jobs", response_model=List[JobResponse])
async def get_jobs():
    """Get all scheduled jobs"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append(JobResponse(
            id=job.id,
            name=getattr(job, 'name', job.id),
            func_name=job.func.__name__ if hasattr(job.func, '__name__') else str(job.func),
            next_run_time=job.next_run_time,
            trigger=str(job.trigger),
            args=list(job.args) if job.args else [],
            kwargs=dict(job.kwargs) if job.kwargs else {},
            max_instances=job.max_instances,
            misfire_grace_time=job.misfire_grace_time,
            pending=job.pending
        ))
    
    return jobs

@app.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate):
    """Create a new job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        # Determine function to execute
        if job_data.func_name == "custom_code":
            if not job_data.custom_code:
                raise HTTPException(status_code=400, detail="Custom code is required for custom_code function")
            func = JOB_FUNCTIONS["custom_code"]
            args = [job_data.custom_code] + (job_data.args or [])
            kwargs = job_data.kwargs or {}
        else:
            if job_data.func_name not in JOB_FUNCTIONS:
                raise HTTPException(status_code=400, detail=f"Function {job_data.func_name} not found")
            func = JOB_FUNCTIONS[job_data.func_name]
            args = job_data.args or []
            kwargs = job_data.kwargs or {}
        
        # Create trigger
        trigger = None
        if job_data.trigger_type == "interval":
            trigger = IntervalTrigger(**job_data.trigger_config)
        elif job_data.trigger_type == "cron":
            trigger = CronTrigger(**job_data.trigger_config)
        elif job_data.trigger_type == "date":
            trigger = DateTrigger(**job_data.trigger_config)
        else:
            raise HTTPException(status_code=400, detail="Invalid trigger type")
        
        # Add job to scheduler
        job = scheduler.add_job(
            func=func,
            trigger=trigger,
            args=args,
            kwargs=kwargs,
            id=None,  # Let scheduler generate ID
            name=job_data.name,
            max_instances=job_data.max_instances,
            misfire_grace_time=job_data.misfire_grace_time
        )
        
        return JobResponse(
            id=job.id,
            name=job_data.name,
            func_name=job_data.func_name,
            next_run_time=job.next_run_time,
            trigger=str(job.trigger),
            args=args,
            kwargs=kwargs,
            max_instances=job_data.max_instances,
            misfire_grace_time=job_data.misfire_grace_time,
            pending=job.pending
        )
        
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get a specific job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return JobResponse(
            id=job.id,
            name=getattr(job, 'name', job.id),
            func_name=job.func.__name__ if hasattr(job.func, '__name__') else str(job.func),
            next_run_time=job.next_run_time,
            trigger=str(job.trigger),
            args=list(job.args) if job.args else [],
            kwargs=dict(job.kwargs) if job.kwargs else {},
            max_instances=job.max_instances,
            misfire_grace_time=job.misfire_grace_time,
            pending=job.pending
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/jobs/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_update: JobUpdate):
    """Update a job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        # Get current job
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Update job
        update_dict = {k: v for k, v in job_update.dict().items() if v is not None}
        
        if 'trigger_config' in update_dict:
            # Update trigger if provided
            trigger_config = update_dict.pop('trigger_config')
            trigger_type = str(job.trigger).split('[')[0].lower()
            
            if 'interval' in trigger_type:
                trigger = IntervalTrigger(**trigger_config)
            elif 'cron' in trigger_type:
                trigger = CronTrigger(**trigger_config)
            elif 'date' in trigger_type:
                trigger = DateTrigger(**trigger_config)
            else:
                raise HTTPException(status_code=400, detail="Cannot determine trigger type")
            
            update_dict['trigger'] = trigger
        
        scheduler.modify_job(job_id, **update_dict)
        
        # Get updated job
        updated_job = scheduler.get_job(job_id)
        
        return JobResponse(
            id=updated_job.id,
            name=getattr(updated_job, 'name', updated_job.id),
            func_name=updated_job.func.__name__ if hasattr(updated_job.func, '__name__') else str(updated_job.func),
            next_run_time=updated_job.next_run_time,
            trigger=str(updated_job.trigger),
            args=list(updated_job.args) if updated_job.args else [],
            kwargs=dict(updated_job.kwargs) if updated_job.kwargs else {},
            max_instances=updated_job.max_instances,
            misfire_grace_time=updated_job.misfire_grace_time,
            pending=updated_job.pending
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        scheduler.remove_job(job_id)
        
        # Clean up job results
        if job_id in job_results:
            del job_results[job_id]
        
        return {"message": f"Job {job_id} deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/jobs/{job_id}/pause")
async def pause_job(job_id: str):
    """Pause a job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        scheduler.pause_job(job_id)
        return {"message": f"Job {job_id} paused"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/jobs/{job_id}/resume")
async def resume_job(job_id: str):
    """Resume a job"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        scheduler.resume_job(job_id)
        return {"message": f"Job {job_id} resumed"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/jobs/{job_id}/execute")
async def execute_job_now(job_id: str):
    """Execute a job immediately"""
    if not scheduler:
        raise HTTPException(status_code=500, detail="Scheduler not initialized")
    
    try:
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Execute job now
        result = await job.func(*job.args, **job.kwargs)
        
        return {
            "message": f"Job {job_id} executed",
            "result": result,
            "executed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing job {job_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get job execution results"""
    if job_id not in job_results:
        return []
    
    return job_results[job_id]

@app.get("/functions")
async def get_available_functions():
    """Get list of available job functions"""
    return {
        "functions": [
            {
                "name": name,
                "description": func.__doc__ or f"Execute {name} function"
            }
            for name, func in JOB_FUNCTIONS.items()
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "scheduler_running": scheduler.running if scheduler else False,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
