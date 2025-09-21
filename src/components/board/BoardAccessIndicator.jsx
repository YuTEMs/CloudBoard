'use client'

import { Chip } from '@heroui/chip'
import { Tooltip } from '@heroui/tooltip'
import { EyeIcon, EditIcon, CrownIcon } from 'lucide-react'

export default function BoardAccessIndicator({ role, permissions, size = 'sm', showIcon = true, showText = true }) {
  const getRoleConfig = (role) => {
    switch (role) {
      case 'owner':
        return {
          icon: <CrownIcon className="h-3 w-3" />,
          emoji: '👑',
          label: 'Owner',
          color: 'success',
          description: 'Full access - can edit, delete, and manage members'
        }
      case 'editor':
        return {
          icon: <EditIcon className="h-3 w-3" />,
          emoji: '✏️',
          label: 'Editor',
          color: 'primary',
          description: 'Can edit board content but cannot delete or manage members'
        }
      case 'viewer':
        return {
          icon: <EyeIcon className="h-3 w-3" />,
          emoji: '👁️',
          label: 'Viewer',
          color: 'default',
          description: 'Read-only access - can view board in display mode'
        }
      default:
        return {
          icon: <EyeIcon className="h-3 w-3" />,
          emoji: '👤',
          label: 'Guest',
          color: 'default',
          description: 'Limited access'
        }
    }
  }

  if (!role) {
    return null
  }

  const config = getRoleConfig(role)

  const chipContent = (
    <>
      {showIcon && config.icon}
      {showText && config.label}
    </>
  )

  return (
    <Tooltip content={config.description} delay={500}>
      <Chip
        color={config.color}
        variant="flat"
        size={size}
        startContent={showIcon ? config.icon : null}
      >
        {showText ? config.label : config.emoji}
      </Chip>
    </Tooltip>
  )
}

// Helper component for just the icon/emoji
export function BoardAccessIcon({ role, size = 'sm' }) {
  return (
    <BoardAccessIndicator
      role={role}
      size={size}
      showIcon={false}
      showText={false}
    />
  )
}

// Helper component for permission-based access
export function PermissionChip({ permissions, type, size = 'sm' }) {
  if (!permissions) return null

  const getPermissionConfig = (type, hasPermission) => {
    const configs = {
      read: {
        icon: <EyeIcon className="h-3 w-3" />,
        label: 'View',
        color: hasPermission ? 'success' : 'default'
      },
      write: {
        icon: <EditIcon className="h-3 w-3" />,
        label: 'Edit',
        color: hasPermission ? 'primary' : 'default'
      },
      delete: {
        icon: <CrownIcon className="h-3 w-3" />,
        label: 'Delete',
        color: hasPermission ? 'danger' : 'default'
      },
      invite: {
        icon: <CrownIcon className="h-3 w-3" />,
        label: 'Invite',
        color: hasPermission ? 'secondary' : 'default'
      }
    }

    return configs[type] || configs.read
  }

  const hasPermission = permissions[type]
  const config = getPermissionConfig(type, hasPermission)

  return (
    <Chip
      color={config.color}
      variant={hasPermission ? 'flat' : 'bordered'}
      size={size}
      startContent={config.icon}
    >
      {config.label}
    </Chip>
  )
}