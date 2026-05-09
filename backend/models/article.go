package models

import "time"

type Article struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Title     string    `json:"title" gorm:"size:500"`
	Content   string    `json:"content" gorm:"type:text"`
	CoverURL  string    `json:"coverUrl" gorm:"size:1000"`
	Style     string    `json:"style" gorm:"size:100"`
	Status    string    `json:"status" gorm:"size:50;default:draft"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PlatformConfig struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Platform string `json:"platform" gorm:"uniqueIndex;size:50"`
	Token    string `json:"-" gorm:"size:2000"`
	Config   string `json:"config" gorm:"type:text"`
}
