/**
 * SPDX-FileCopyrightText: 2020 Nextcloud GmbH and Nextcloud contributors
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { t } from '@nextcloud/l10n'

import type {
	Conversation,
	Participant,
	ParticipantSearchResult,
	ParticipantStatus,
} from '../types/index.ts'

/**
 * Generate full status message for user according to its status data
 *
 * @param userData user data (from conversation, participant, search result)
 */
export function getStatusMessage(userData?: ParticipantStatus | ''): string {
	if (!userData) {
		return ''
	}

	let status = userData.icon ?? ''

	if (userData.message) {
		status += ' ' + userData.message
	} else if (userData.status === 'dnd') {
		status += ' ' + t('spreed', 'Do not disturb')
	} else if (userData.status === 'away') {
		status += ' ' + t('spreed', 'Away')
	}

	return status
}

/**
 * Check if current status is "Do not disturb"
 *
 * @param userData user data
 */
export function isDoNotDisturb(userData: Conversation | Participant | ParticipantSearchResult): boolean {
	return userData?.status === 'dnd'
}
