import type { ComponentType } from 'react'
import { Globe, Mail, MessageCircle, Send } from 'lucide-react'
import { VkIcon } from './BrandIcons'
import { cn } from '../lib/cn'
import { linkProps } from '../lib/links'

type IconComponent = ComponentType<{ size?: number; className?: string }>

const ICONS: Record<string, IconComponent> = {
  'message-circle': MessageCircle,
  send: Send,
  mail: Mail,
  globe: Globe,
  vk: VkIcon,
}

/** Плитка канала связи — компонент «Плитка мессенджера» из дизайн-системы. */
export function MessengerTile({
  icon,
  channel,
  contact,
  href,
  force,
  className,
}: {
  icon: string
  channel: string
  /** Без него плитка показывает только название канала — так скрыт адрес у ВК. */
  contact?: string
  href: string
  force?: boolean
  className?: string
}) {
  const Icon = ICONS[icon] ?? Globe

  return (
    <a
      {...linkProps(href, { force })}
      className={cn(
        'group flex w-fit items-center gap-3 rounded-[12px] border-[1.5px] border-[#B9C3D6] bg-[#FFFFFF99] px-[18px] py-3 transition-[translate,background-color,border-color] duration-300 hover:-translate-y-[2px] hover:border-[var(--accent)] hover:bg-white',
        className,
      )}
    >
      <Icon
        size={24}
        className="shrink-0 text-[var(--ink)] transition-colors duration-300 group-hover:text-[var(--accent)]"
      />
      <span className="flex flex-col gap-[2px]">
        {contact ? (
          <>
            <span className="text-[13px] font-semibold text-[var(--ink-2)]">{channel}</span>
            <span className="text-[15px] font-semibold text-[var(--ink)]">{contact}</span>
          </>
        ) : (
          <span className="text-[15px] font-semibold text-[var(--ink)]">{channel}</span>
        )}
      </span>
    </a>
  )
}
