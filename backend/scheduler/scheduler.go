package scheduler

import (
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusPaused    TaskStatus = "paused"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
)

type Task struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	Name      string     `json:"name"`
	Topic     string     `json:"topic"`
	CronExpr  string     `json:"cronExpr"`
	Style     string     `json:"style"`
	Platforms string     `json:"platforms"`
	Status    TaskStatus `json:"status"`
	LastRun   *time.Time `json:"lastRun"`
	NextRun   *time.Time `json:"nextRun"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

type TaskFunc func(task *Task)

type Scheduler struct {
	cron     *cron.Cron
	tasks    map[uint]cron.EntryID
	mu       sync.RWMutex
	taskFunc TaskFunc
}

func New() *Scheduler {
	return &Scheduler{
		cron:  cron.New(cron.WithSeconds()),
		tasks: make(map[uint]cron.EntryID),
	}
}

func (s *Scheduler) OnTask(fn TaskFunc) {
	s.taskFunc = fn
}

func (s *Scheduler) Start() {
	s.cron.Start()
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
}

func (s *Scheduler) AddTask(task *Task) error {
	entryID, err := s.cron.AddFunc(task.CronExpr, func() {
		if s.taskFunc != nil {
			s.taskFunc(task)
		}
	})
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.tasks[task.ID] = entryID
	s.mu.Unlock()

	entry := s.cron.Entry(entryID)
	next := entry.Next
	task.NextRun = &next
	task.Status = TaskStatusPending
	return nil
}

func (s *Scheduler) RemoveTask(taskID uint) {
	s.mu.Lock()
	if entryID, ok := s.tasks[taskID]; ok {
		s.cron.Remove(entryID)
		delete(s.tasks, taskID)
	}
	s.mu.Unlock()
}
