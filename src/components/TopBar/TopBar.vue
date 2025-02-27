<!--
  - SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="top-bar"
		:class="{ 'top-bar--sidebar': isSidebar}"
		:style="topBarStyle"
		:data-theme-dark="isInCall">
		<ConversationIcon :key="conversation.token"
			class="conversation-icon"
			:offline="isPeerInactive"
			:item="conversation"
			:size="AVATAR.SIZE.DEFAULT"
			:disable-menu="false"
			show-user-online-status
			:hide-favorite="false"
			:hide-call="false" />
		<!-- conversation header -->
		<a role="button"
			class="conversation-header"
			@click="openConversationSettings">
			<div class="conversation-header__text"
				:class="{'conversation-header__text--offline': isPeerInactive}">
				<p class="title">
					{{ conversation.displayName }}
				</p>
				<p v-if="showUserStatusAsDescription"
					class="description"
					:class="{'description__in-chat' : !isInCall }">
					{{ statusMessage }}
				</p>
				<template v-if="conversation.description">
					<p v-tooltip.bottom="{
							content: renderedDescription,
							delay: { show: 500, hide: 500 },
							autoHide: false,
							html: true,
						}"
						class="description"
						:class="{'description__in-chat' : !isInCall }">
						{{ conversation.description }}
					</p>
				</template>
			</div>
		</a>

		<a v-if="showUpcomingEvent"
			class="upcoming-event"
			:href="nextEvent.calendarAppUrl"
			:title="t('spreed', 'Open Calendar')"
			target="_blank">
			<div class="icon">
				<CalendarBlank :size="20" />
			</div>
			<div class="event-info">
				<p class="event-info__header">
					{{ t('spreed', 'Next call') }}
				</p>
				<p> {{ eventInfo }} </p>
			</div>
		</a>

		<!-- Call time -->
		<CallTime v-if="isInCall"
			:start="conversation.callStartTime" />

		<!-- Participants counter -->
		<NcButton v-if="isInCall && !isOneToOneConversation && isModeratorOrUser"
			:title="participantsInCallAriaLabel"
			:aria-label="participantsInCallAriaLabel"
			type="tertiary"
			@click="openSidebar('participants')">
			<template #icon>
				<AccountMultiple :size="20" />
			</template>
			{{ participantsInCall }}
		</NcButton>

		<!-- Reactions menu -->
		<ReactionMenu v-if="isInCall && hasReactionSupport"
			:token="token"
			:supported-reactions="supportedReactions"
			:local-call-participant-model="localCallParticipantModel" />

		<!-- Local media controls -->
		<TopBarMediaControls v-if="isInCall"
			:token="token"
			:model="localMediaModel"
			:is-sidebar="isSidebar"
			:local-call-participant-model="localCallParticipantModel" />

		<!-- TopBar menu -->
		<TopBarMenu :token="token"
			:show-actions="!isSidebar"
			:is-sidebar="isSidebar"
			:model="localMediaModel"
			@open-breakout-rooms-editor="showBreakoutRoomsEditor = true" />

		<CallButton shrink-on-mobile :hide-text="isSidebar" :is-screensharing="!!localMediaModel.attributes.localScreen" />

		<!-- Breakout rooms editor -->
		<BreakoutRoomsEditor v-if="showBreakoutRoomsEditor"
			:token="token"
			@close="showBreakoutRoomsEditor = false" />
	</div>
</template>

<script>
import AccountMultiple from 'vue-material-design-icons/AccountMultiple.vue'
import CalendarBlank from 'vue-material-design-icons/CalendarBlank.vue'

import { emit } from '@nextcloud/event-bus'
import { t, n } from '@nextcloud/l10n'
import moment from '@nextcloud/moment'

import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import { useIsMobile } from '@nextcloud/vue/dist/Composables/useIsMobile.js'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip.js'
import richEditor from '@nextcloud/vue/dist/Mixins/richEditor.js'

import CallButton from './CallButton.vue'
import CallTime from './CallTime.vue'
import ReactionMenu from './ReactionMenu.vue'
import TopBarMediaControls from './TopBarMediaControls.vue'
import TopBarMenu from './TopBarMenu.vue'
import BreakoutRoomsEditor from '../BreakoutRoomsEditor/BreakoutRoomsEditor.vue'
import ConversationIcon from '../ConversationIcon.vue'

import { useGetParticipants } from '../../composables/useGetParticipants.js'
import { AVATAR, CONVERSATION } from '../../constants.js'
import BrowserStorage from '../../services/BrowserStorage.js'
import { getTalkConfig } from '../../services/CapabilitiesManager.ts'
import { useChatExtrasStore } from '../../stores/chatExtras.js'
import { getStatusMessage } from '../../utils/userStatus.js'
import { localCallParticipantModel, localMediaModel } from '../../utils/webrtc/index.js'

export default {
	name: 'TopBar',

	directives: {
		Tooltip,
	},

	components: {
		// Components
		BreakoutRoomsEditor,
		CallButton,
		CallTime,
		ConversationIcon,
		TopBarMediaControls,
		NcButton,
		TopBarMenu,
		ReactionMenu,
		// Icons
		AccountMultiple,
		CalendarBlank,
	},

	mixins: [richEditor],

	props: {
		isInCall: {
			type: Boolean,
			required: true,
		},

		/**
		 * In the sidebar the conversation settings are hidden
		 */
		isSidebar: {
			type: Boolean,
			default: false,
		},
	},

	setup() {
		useGetParticipants()

		return {
			AVATAR,
			localCallParticipantModel,
			localMediaModel,
			chatExtrasStore: useChatExtrasStore(),
			isMobile: useIsMobile(),
		}
	},

	data: () => {
		return {
			showBreakoutRoomsEditor: false,
		}
	},

	computed: {
		container() {
			return this.$store.getters.getMainContainerSelector()
		},

		isOneToOneConversation() {
			return this.conversation.type === CONVERSATION.TYPE.ONE_TO_ONE
				|| this.conversation.type === CONVERSATION.TYPE.ONE_TO_ONE_FORMER
		},

		isModeratorOrUser() {
			return this.$store.getters.isModeratorOrUser
		},

		token() {
			return this.$store.getters.getToken()
		},

		conversation() {
			return this.$store.getters.conversation(this.token) || this.$store.getters.dummyConversation
		},

		showUserStatusAsDescription() {
			return this.isOneToOneConversation && this.statusMessage
		},

		statusMessage() {
			return getStatusMessage(this.conversation)
		},

		renderedDescription() {
			return this.renderContent(this.conversation.description)
		},

		/**
		 * Current actor id
		 */
		actorId() {
			return this.$store.getters.getActorId()
		},

		/**
		 * Online status of the peer in one to one conversation.
		 */
		isPeerInactive() {
			// Only compute this in one-to-one conversations
			if (!this.isOneToOneConversation) {
				return undefined
			}

			// Get the 1 to 1 peer
			let peer
			const participants = this.$store.getters.participantsList(this.token)
			for (const participant of participants) {
				if (participant.actorId !== this.actorId) {
					peer = participant
				}
			}

			if (peer) {
				return !peer.sessionIds.length
			} else return false
		},

		participantsInCall() {
			return this.$store.getters.participantsInCall(this.token) || ''
		},

		participantsInCallAriaLabel() {
			return n('spreed', '%n participant in call', '%n participants in call', this.$store.getters.participantsInCall(this.token))
		},

		supportedReactions() {
			return getTalkConfig(this.token, 'call', 'supported-reactions')
		},

		hasReactionSupport() {
			return this.isInCall && this.supportedReactions?.length > 0
		},

		topBarStyle() {
			return {
				'--original-color-main-text': window.getComputedStyle(document.body).getPropertyValue('--color-main-text'),
				'--original-color-main-background': window.getComputedStyle(document.body).getPropertyValue('--color-main-background')
			}
		},

		nextEvent() {
			return this.chatExtrasStore.getNextEvent(this.token)
		},

		eventInfo() {
			if (!this.nextEvent) {
				return null
			}

			// If timestamp is in the past, show "now"
			if (this.nextEvent.start <= moment().unix()) {
				return t('spreed', 'Now')
			}

			return moment(this.nextEvent.start * 1000).calendar()
		},

		showUpcomingEvent() {
			return this.nextEvent && !this.isInCall && !this.isSidebar && !this.isMobile
		},
	},

	watch: {
		token: {
			immediate: true,
			handler(value) {
				if (!value || this.isSidebar) {
					return
				}
				this.chatExtrasStore.getUpcomingEvents(value)
			}
		},
	},

	mounted() {
		document.body.classList.add('has-topbar')
		document.addEventListener('fullscreenchange', this.fullScreenChanged, false)
		document.addEventListener('mozfullscreenchange', this.fullScreenChanged, false)
		document.addEventListener('MSFullscreenChange', this.fullScreenChanged, false)
		document.addEventListener('webkitfullscreenchange', this.fullScreenChanged, false)
	},

	beforeDestroy() {
		document.removeEventListener('fullscreenchange', this.fullScreenChanged, false)
		document.removeEventListener('mozfullscreenchange', this.fullScreenChanged, false)
		document.removeEventListener('MSFullscreenChange', this.fullScreenChanged, false)
		document.removeEventListener('webkitfullscreenchange', this.fullScreenChanged, false)
		document.body.classList.remove('has-topbar')
	},

	methods: {
		t,
		n,
		openSidebar(activeTab) {
			if (typeof activeTab === 'string') {
				emit('spreed:select-active-sidebar-tab', activeTab)
			}
			this.$store.dispatch('showSidebar')
			BrowserStorage.setItem('sidebarOpen', 'true')
		},

		fullScreenChanged() {
			this.$store.dispatch(
				'setIsFullscreen',
				document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement
			)
		},

		openConversationSettings() {
			emit('show-conversation-settings', { token: this.token })
		},
	},
}
</script>

<style lang="scss" scoped>
.top-bar {
	--border-width: 1px;
	display: flex;
	flex-wrap: wrap;
	z-index: 10;
	gap: 3px;
	align-items: center;
	justify-content: flex-end;
	min-height: calc(var(--border-width) + 2 * (2 * var(--default-grid-baseline)) + var(--default-clickable-area));
	padding-block: var(--default-grid-baseline);
	// Reserve space for the sidebar toggle button
	padding-inline: calc(2 * var(--default-grid-baseline)) calc(2 * var(--default-grid-baseline) + var(--app-sidebar-offset, 0));
	background-color: var(--color-main-background);
	border-bottom: var(--border-width) solid var(--color-border);

	.talk-sidebar-callview & {
		margin-right: var(--default-clickable-area);
	}

	&[data-theme-dark="true"] {
		right: 0;
		border: none;
		position: absolute;
		top: 0;
		left: 0;
		background-color: transparent;
	}

	&--sidebar {
		padding: calc(2 * var(--default-grid-baseline));

		.conversation-icon {
			margin-left: 0;
		}
	}
}

.conversation-icon {
	margin-left: 48px;
}

.conversation-header {
	position: relative;
	display: flex;
	overflow-x: hidden;
	overflow-y: clip;
	white-space: nowrap;
	width: 0;
	flex-grow: 1;
	cursor: pointer;
	&__text {
		display: flex;
		flex-direction:column;
		flex-grow: 1;
		margin-left: 8px;
		justify-content: center;
		width: 100%;
		overflow: hidden;
		// Text is guaranteed to be one line. Make line-height 20px to fit top bar
		line-height: 20px;
		&--offline {
			color: var(--color-text-maxcontrast);
		}
	}
	.title {
		font-weight: bold;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.description {
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: fit-content;
		&__in-chat {
			color: var(--color-text-maxcontrast);
		}
	}
}

:deep(.conversation-icon__type) {
	color: var(--original-color-main-text) !important;
	border-color: var(--original-color-main-background) !important;
	background-color: var(--original-color-main-background) !important;
}

.icon {
	display: flex;
}

.upcoming-event {
	display: flex;
	flex-direction: row;
	gap: calc(var(--default-grid-baseline) * 2);
	padding: 0 calc(var(--default-grid-baseline) * 2);
	background-color: rgba(var(--color-info-rgb), 0.1);
	height: 100%;
	border-radius: var(--border-radius);
}

.event-info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	line-height: 20px;

	&__header {
		font-weight: 500;
	}
}

</style>
