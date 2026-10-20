/**
 * Каталог услуг. Сами услуги живут в базе и правятся в админ-панели,
 * здесь — типы, разделы и сборка каталога из плоского списка.
 */

export const CATALOG_PATH = '/services'

/** Пункт чек-листа «Что понадобится». */
export type CatalogNeed = {
  text: string
  /** Метка «если есть» — документ нужен не всем. */
  optional?: boolean
  /** Пояснение мелким шрифтом под пунктом. */
  hint?: string
}

export type GroupId = 'ip' | 'person'

export type Service = {
  id: string
  /** Адрес страницы услуги: /services/<slug> */
  slug: string
  group: GroupId
  /** Пустая строка — услуга без подзаголовка. */
  subgroup: string
  title: string
  price: string
  /** «Кому и когда»; у услуг без чек-листа — описание на карточке. */
  audience: string
  needs: CatalogNeed[]
  /** «Что получите». */
  result: string
}

/** Разделы каталога — они же вкладки-якоря: /services#ip */
export const GROUPS: Array<{ id: GroupId; title: string }> = [
  { id: 'ip', title: 'ИП и ООО' },
  { id: 'person', title: 'Физлица' },
]

export type CatalogSubgroup = {
  title: string
  items: Service[]
}

export type CatalogGroup = {
  id: GroupId
  title: string
  subgroups: CatalogSubgroup[]
}

/**
 * Раскладывает услуги по разделам и подразделам. Сервер отдаёт их уже
 * по порядку, поэтому подразделы идут в порядке своей первой услуги.
 * Пустые разделы не показываем.
 */
export function buildCatalog(services: Service[]): CatalogGroup[] {
  return GROUPS.map((group) => {
    const subgroups: CatalogSubgroup[] = []
    for (const service of services) {
      if (service.group !== group.id) continue
      let subgroup = subgroups.find((s) => s.title === service.subgroup)
      if (!subgroup) {
        subgroup = { title: service.subgroup, items: [] }
        subgroups.push(subgroup)
      }
      subgroup.items.push(service)
    }
    return { ...group, subgroups }
  }).filter((group) => group.subgroups.length > 0)
}

/** На карточке каталога — первые три документа и «и ещё N». */
export const CARD_NEEDS_LIMIT = 3

export const CATALOG_HERO = {
  title: 'Услуги и цены',
  lead: 'Указана базовая стоимость. Точную сумму назовём после просмотра документов — до начала работы.',
}

export const CONSULTATION = {
  label: 'ДЛЯ ВСЕХ',
  title: 'Консультация 15 минут',
  price: '500 ₽',
}

export function serviceHref(slug: string): string {
  return `${CATALOG_PATH}/${slug}`
}

export function groupTitle(id: GroupId): string {
  return GROUPS.find((g) => g.id === id)?.title ?? id
}
