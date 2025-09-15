"use client"

import { Button, Input } from "@heroui/react"
import {
  ImageIcon,
  Video,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Play
} from "lucide-react"

export function ContextPanel({
  selectedItem,
  addToSlideshow,
  moveSlide,
  updateAnnouncement
}) {
  if (!selectedItem || selectedItem.type !== 'widget') {
    return null
  }


  // Announcement Editing Panel
  if (selectedItem.widgetType === 'announcement') {
    const getCurrentDate = () => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return (
      <div className="border-t border-gray-300 bg-white p-4" data-announcement-panel>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900">
            Announcement Settings
          </h4>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedItem.announcement?.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {selectedItem.announcement?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Text */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Announcement Text
              </label>
              <textarea
                value={selectedItem.announcement?.text || ""}
                onChange={(e) => {
                  e.stopPropagation()
                  updateAnnouncement(selectedItem.id, {
                    ...selectedItem.announcement,
                    text: e.target.value
                  })
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                placeholder="Enter your announcement text..."
              />
            </div>
          </div>

          {/* Right Column - Timing and Status */}
          <div className="space-y-4">
            {/* Date Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={selectedItem.announcement?.startDate || getCurrentDate()}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateAnnouncement(selectedItem.id, {
                      ...selectedItem.announcement,
                      startDate: e.target.value
                    })
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={selectedItem.announcement?.endDate || getCurrentDate()}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateAnnouncement(selectedItem.id, {
                      ...selectedItem.announcement,
                      endDate: e.target.value
                    })
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                />
              </div>
            </div>

            {/* Time Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={selectedItem.announcement?.startTime || "09:00"}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateAnnouncement(selectedItem.id, {
                      ...selectedItem.announcement,
                      startTime: e.target.value
                    })
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={selectedItem.announcement?.endTime || "17:00"}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateAnnouncement(selectedItem.id, {
                      ...selectedItem.announcement,
                      endTime: e.target.value
                    })
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItem.announcement?.isActive || false}
                  onChange={(e) => updateAnnouncement(selectedItem.id, {
                    ...selectedItem.announcement,
                    isActive: e.target.checked
                  })}
                  className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Announcement
                </span>
              </label>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Preview</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Text:</strong> {selectedItem.announcement?.text?.substring(0, 50) || "No text"}
                  {selectedItem.announcement?.text?.length > 50 && "..."}
                </p>
                <p><strong>Active Period:</strong> {selectedItem.announcement?.startDate || getCurrentDate()} {selectedItem.announcement?.startTime || "09:00"} - {selectedItem.announcement?.endDate || getCurrentDate()} {selectedItem.announcement?.endTime || "17:00"}</p>
                <p><strong>Status:</strong> {selectedItem.announcement?.isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}