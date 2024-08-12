/*
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { markRaw, ref } from 'vue'
import type { Ref } from 'vue'

type TalkSettingsSection = {
	/**
	 * Section ID
	 */
	id: string
	/**
	 * Section name, passed to NcAppSettingSection component
	 */
	name: string
	/**
	 * WebComponent (custom element) name to render as the section content
	 */
	element: string,
}

const additionalSettingsSections: Ref<TalkSettingsSection[]> = ref([])

/**
 * Register an additional settings section
 * @param section - Settings section
 */
export function registerSettingsSection(section: TalkSettingsSection) {
	additionalSettingsSections.value.push(markRaw(section))
}

/**
 * Unregister an additional settings section
 * @param id - Section ID
 */
export function unregisterSettingsSection(id: string) {
	const index = additionalSettingsSections.value.findIndex((section) => section.id === id)
	if (index !== -1) {
		additionalSettingsSections.value.splice(index, 1)
	}
}

/**
 * Talk Settings Dialog composable
 */
export function useSettingsDialog() {
	return {
		additionalSettingsSections,
	}
}
