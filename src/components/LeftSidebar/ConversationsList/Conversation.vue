<!--
  - SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<NcListItem ref="listItem"
		:key="item.token"
		:name="item.displayName"
		:title="item.displayName"
		:data-nav-id="`conversation_${item.token}`"
		:class="['conversation', { 'conversation--active': isActive }]"
		:actions-aria-label="t('spreed', 'Conversation actions')"
		:to="to"
		:bold="!!item.unreadMessages"
		:counter-number="item.unreadMessages"
		:counter-type="counterType"
		force-menu
		@click="onClick">
		<template #icon>
			<ConversationIcon :item="item" :hide-favorite="false" :hide-call="false" />
		</template>
		<template #subname>
			{{ conversationInformation }}
		</template>
		<template v-if="!isSearchResult" #actions>
			<NcActionButton v-if="canFavorite"
				key="toggle-favorite"
				close-after-click
				@click="toggleFavoriteConversation">
				<template #icon>
					<IconStar :size="16" :fill-color="!item.isFavorite ? '#FFCC00' : undefined" />
				</template>
				{{ labelFavorite }}
			</NcActionButton>

			<NcActionButton key="copy-link" @click.stop="handleCopyLink">
				<template #icon>
					<IconContentCopy :size="16" />
				</template>
				{{ t('spreed', 'Copy link') }}
			</NcActionButton>

			<NcActionButton key="toggle-read" close-after-click @click="toggleReadConversation">
				<template #icon>
					<IconEye v-if="item.unreadMessages" :size="16" />
					<IconEyeOff v-else :size="16" />
				</template>
				{{ labelRead }}
			</NcActionButton>

			<NcActionButton key="show-settings" close-after-click @click="showConversationSettings">
				<template #icon>
					<IconCog :size="16" />
				</template>
				{{ t('spreed', 'Conversation settings') }}
			</NcActionButton>

			<NcActionButton v-if="item.canLeaveConversation"
				key="leave-conversation"
				close-after-click
				@click="leaveConversation">
				<template #icon>
					<IconExitToApp :size="16" />
				</template>
				{{ t('spreed', 'Leave conversation') }}
			</NcActionButton>

			<NcActionButton v-if="item.canDeleteConversation"
				key="delete-conversation"
				close-after-click
				class="critical"
				@click="isDialogOpen = true">
				<template #icon>
					<IconDelete :size="16" />
				</template>
				{{ t('spreed', 'Delete conversation') }}
			</NcActionButton>
		</template>

		<template v-else-if="item.token" #actions>
			<NcActionButton key="join-conversation" close-after-click @click="onActionClick">
				<template #icon>
					<IconArrowRight :size="16" />
				</template>
				{{ t('spreed', 'Join conversation') }}
			</NcActionButton>

			<NcActionButton key="copy-link" @click.stop="handleCopyLink">
				<template #icon>
					<IconContentCopy :size="16" />
				</template>
				{{ t('spreed', 'Copy link') }}
			</NcActionButton>
		</template>

		<!-- confirmation required to delete conversation -->
		<template v-if="isDialogOpen" #extra>
			<NcDialog :open.sync="isDialogOpen"
				:name="t('spreed','Delete conversation')"
				:message="dialogMessage"
				:container="container">
				<template #actions>
					<NcButton type="tertiary" @click="isDialogOpen = false">
						{{ t('spreed', 'No') }}
					</NcButton>
					<NcButton type="error" @click="deleteConversation">
						{{ t('spreed', 'Yes') }}
					</NcButton>
				</template>
			</NcDialog>
		</template>
	</NcListItem>
</template>

<script>

import { toRefs } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

import IconArrowRight from 'vue-material-design-icons/ArrowRight.vue'
import IconCog from 'vue-material-design-icons/Cog.vue'
import IconContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import IconDelete from 'vue-material-design-icons/Delete.vue'
import IconExitToApp from 'vue-material-design-icons/ExitToApp.vue'
import IconEye from 'vue-material-design-icons/Eye.vue'
import IconEyeOff from 'vue-material-design-icons/EyeOff.vue'
import IconStar from 'vue-material-design-icons/Star.vue'

import { showError } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { t } from '@nextcloud/l10n'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcDialog from '@nextcloud/vue/dist/Components/NcDialog.js'
import NcListItem from '@nextcloud/vue/dist/Components/NcListItem.js'

import ConversationIcon from './../../ConversationIcon.vue'

import { useConversationInfo } from '../../../composables/useConversationInfo.js'
import { PARTICIPANT } from '../../../constants.js'
import { copyConversationLinkToClipboard } from '../../../utils/handleUrl.ts'

export default {
	name: 'Conversation',

	components: {
		NcButton,
		ConversationIcon,
		NcActionButton,
		NcDialog,
		NcListItem,
		IconArrowRight,
		IconCog,
		IconContentCopy,
		IconDelete,
		IconExitToApp,
		IconEyeOff,
		IconEye,
		IconStar,

	},

	props: {
		isSearchResult: {
			type: Boolean,
			default: false,
		},
		item: {
			type: Object,
			default() {
				return {
					token: '',
					participants: [],
					participantType: 0,
					unreadMessages: 0,
					unreadMention: false,
					objectType: '',
					type: 0,
					displayName: '',
					isFavorite: false,
					notificationLevel: 0,
					lastMessage: {},
					canDeleteConversation: false,
					canLeaveConversation: false,
				}
			},
		},
	},

	emits: ['click'],

	setup(props) {
		const { item, isSearchResult } = toRefs(props)
		const { counterType, conversationInformation } = useConversationInfo({ item, isSearchResult })

		return {
			counterType,
			conversationInformation,
		}
	},

	data() {
		return {
			isDialogOpen: false,
		}
	},

	computed: {
		container() {
			return this.$store.getters.getMainContainerSelector()
		},

		canFavorite() {
			return this.item.participantType !== PARTICIPANT.TYPE.USER_SELF_JOINED
		},

		labelRead() {
			return this.item.unreadMessages ? t('spreed', 'Mark as read') : t('spreed', 'Mark as unread')
		},

		labelFavorite() {
			return this.item.isFavorite ? t('spreed', 'Remove from favorites') : t('spreed', 'Add to favorites')
		},

		dialogMessage() {
			return t('spreed', 'Do you really want to delete "{displayName}"?', this.item, undefined, {
				escape: false,
				sanitize: false,
			})
		},

		to() {
			return this.item?.token
				? { name: 'conversation', params: { token: this.item.token } }
				: null
		},

		isActive() {
			return this.$route?.params?.token === this.item.token
		}
	},

	methods: {
		t,
		handleCopyLink() {
			copyConversationLinkToClipboard(this.item.token)
		},

		toggleReadConversation() {
			if (this.item.unreadMessages) {
				this.$store.dispatch('clearLastReadMessage', { token: this.item.token })
			} else {
				this.$store.dispatch('markConversationUnread', { token: this.item.token })
			}
		},

		showConversationSettings() {
			emit('show-conversation-settings', { token: this.item.token })
		},

		/**
		 * Deletes the conversation.
		 */
		async deleteConversation() {
			try {
				this.isDialogOpen = false
				if (this.isActive) {
					await this.$store.dispatch('leaveConversation', { token: this.item.token })
					await this.$router.push({ name: 'root' })
						.catch((failure) => !isNavigationFailure(failure, NavigationFailureType.duplicated) && Promise.reject(failure))
				}
				await this.$store.dispatch('deleteConversationFromServer', { token: this.item.token })
			} catch (error) {
				console.error(`Error while deleting conversation ${error}`)
				showError(t('spreed', 'Error while deleting conversation'))
			}
		},

		/**
		 * Deletes the current user from the conversation.
		 */
		async leaveConversation() {
			try {
				if (this.isActive) {
					await this.$store.dispatch('leaveConversation', { token: this.item.token })
					await this.$router.push({ name: 'root' })
						.catch((failure) => !isNavigationFailure(failure, NavigationFailureType.duplicated) && Promise.reject(failure))
				}
				await this.$store.dispatch('removeCurrentUserFromConversation', { token: this.item.token })
			} catch (error) {
				if (error?.response?.status === 400) {
					showError(t('spreed', 'You need to promote a new moderator before you can leave the conversation.'))
				} else {
					console.error(`Error while removing yourself from conversation ${error}`)
				}
			}
		},

		async toggleFavoriteConversation() {
			this.$store.dispatch('toggleFavorite', this.item)
		},

		/**
		 * Set the notification level for the conversation
		 *
		 * @param {number} level The notification level to set.
		 */
		async setNotificationLevel(level) {
			await this.$store.dispatch('setNotificationLevel', {
				token: this.item.token,
				notificationLevel: level,
			})
		},

		onClick() {
			// add as temporary item that will refresh after the joining process is complete
			if (this.isSearchResult) {
				this.$store.dispatch('addConversation', this.item)
			}
			this.$emit('click')
		},

		onActionClick() {
			this.onClick()
			// NcActionButton is not a RouterLink, so we should route user manually
			this.$router.push(this.to)
				.catch(err => console.debug(`Error while pushing the new conversation's route: ${err}`))
		},
	},
}
</script>

<style lang="scss" scoped>
.critical > :deep(.action-button) {
	color: var(--color-error);
}

.conversation {
	// Overwrite ConversationIcon styles to blend a type icon with NcListItem
	& :deep(.list-item:hover .conversation-icon__type) {
		background-color: var(--color-background-hover);
		border-color: var(--color-background-hover);
	}

	&--active {
		&:deep(.list-item .conversation-icon__type) {
			color: var(--color-primary-element-text);
			background-color: var(--color-primary-element);
			border-color: var(--color-primary-element);
		}

		&:deep(.list-item:hover .conversation-icon__type) {
			color: var(--color-primary-element-text);
			background-color: var(--color-primary-element-hover);
			border-color: var(--color-primary-element-hover);
		}
	}
}

:deep(.dialog) {
	padding-block: 0 8px;
	padding-inline: 12px 8px;
}
</style>
