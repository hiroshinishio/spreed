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
} from '../types'

type AnyDataWithUserStatus = Conversation | Participant | ParticipantSearchResult

/**
 * Parse user status data from conversation, participant or search result to a single type object
 * @param userData current user data
 */
function parseUserStatus(userData: AnyDataWithUserStatus): ParticipantStatus {
	if (typeof userData.status === 'object') {
		return userData.status as ParticipantStatus
	} else {
		return {
			status: (userData as Participant).status,
			message: (userData as Participant).statusMessage,
			icon: (userData as Participant).statusIcon,
			clearAt: (userData as Participant).statusClearAt,
		}
	}
}

/**
 * Generate full status message for user according to its status data
 *
 * @param userData user data (conversation, participant, search result)
 */
export function getStatusMessage(userData: AnyDataWithUserStatus): string {
	if (!userData) {
		return ''
	}

	const userStatus = parseUserStatus(userData)

	let status = userStatus.icon ?? ''

	if (userStatus.message) {
		status += ' ' + userStatus.message
	} else if (userStatus.status === 'dnd') {
		status += ' ' + t('spreed', 'Do not disturb')
	} else if (userStatus.status === 'away') {
		status += ' ' + t('spreed', 'Away')
	}

	return status
}

/**
 * Check if current status is "Do not disturb"
 *
 * @param userData user data
 */
export function isDoNotDisturb(userData: AnyDataWithUserStatus): boolean {
	return userData?.status === 'dnd'
}
