<!--
  - SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="top-bar__wrapper">
		<TransitionExpand v-if="isInCall" :show="isHandRaised" direction="horizontal">
			<NcButton v-tooltip="raiseHandButtonLabel"
				:aria-label="raiseHandButtonLabel"
				type="tertiary"
				@click.stop="toggleHandRaised">
				<template #icon>
					<!-- The following icon is much bigger than all the others
						so we reduce its size -->
					<HandBackLeft :size="18" />
				</template>
			</NcButton>
		</TransitionExpand>

		<NcActions v-if="!isSidebar"
			v-tooltip="t('spreed', 'Conversation actions')"
			:aria-label="t('spreed', 'Conversation actions')"
			type="tertiary"
			:container="container">
			<!-- Menu icon: white if in call -->
			<template v-if="isInCall" #icon>
				<DotsHorizontal :size="20" />
			</template>

			<template v-if="showActions && isInCall">
				<!-- Raise hand -->
				<NcActionButton close-after-click
					@click="toggleHandRaised">
					<!-- The following icon is much bigger than all the others
					so we reduce its size -->
					<template #icon>
						<HandBackLeft :size="16" />
					</template>
					{{ raiseHandButtonLabel }}
				</NcActionButton>

				<!-- Mute others -->
				<template v-if="!isOneToOneConversation && canFullModerate">
					<NcActionButton close-after-click
						@click="forceMuteOthers">
						<template #icon>
							<MicrophoneOff :size="20" />
						</template>
						{{ t('spreed', 'Mute others') }}
					</NcActionButton>
				</template>

				<!-- Device settings -->
				<NcActionButton close-after-click
					@click="showMediaSettingsDialog">
					<template #icon>
						<VideoIcon :size="20" />
					</template>
					{{ t('spreed', 'Media settings') }}
				</NcActionButton>
				<NcActionSeparator />
				<!-- Call layout switcher -->
				<NcActionButton v-if="showCallLayoutSwitch"
					close-after-click
					@click="changeView">
					<template #icon>
						<GridView v-if="!isGrid"
							:size="20" />
						<PromotedView v-else
							:size="20" />
					</template>
					{{ changeViewText }}
				</NcActionButton>
			</template>

			<!-- Fullscreen -->
			<NcActionButton :aria-label="t('spreed', 'Toggle full screen')"
				close-after-click
				@click="toggleFullscreen">
				<template #icon>
					<Fullscreen v-if="!isFullscreen" :size="20" />
					<FullscreenExit v-else :size="20" />
				</template>
				{{ labelFullscreen }}
			</NcActionButton>

			<!-- Go to file -->
			<NcActionLink v-if="isFileConversation"
				:href="linkToFile">
				<template #icon>
					<File :size="20" />
				</template>
				{{ t('spreed', 'Go to file') }}
			</NcActionLink>

			<!-- Call recording -->
			<template v-if="canModerateRecording">
				<NcActionButton v-if="!isRecording && !isStartingRecording && isInCall"
					close-after-click
					@click="startRecording">
					<template #icon>
						<RecordCircle :size="20" />
					</template>
					{{ t('spreed', 'Start recording') }}
				</NcActionButton>
				<NcActionButton v-else-if="isStartingRecording && isInCall"
					close-after-click
					@click="stopRecording">
					<template #icon>
						<NcLoadingIcon :size="20" />
					</template>
					{{ t('spreed', 'Cancel recording start') }}
				</NcActionButton>
				<NcActionButton v-else-if="isRecording && isInCall"
					close-after-click
					@click="stopRecording">
					<template #icon>
						<StopIcon :size="20" />
					</template>
					{{ t('spreed', 'Stop recording') }}
				</NcActionButton>
			</template>

			<!-- Breakout rooms -->
			<NcActionButton v-if="canConfigureBreakoutRooms"
				close-after-click
				@click="$emit('open-breakout-rooms-editor')">
				<template #icon>
					<DotsCircle :size="20" />
				</template>
				{{ t('spreed', 'Set up breakout rooms') }}
			</NcActionButton>

			<!-- Conversation settings -->
			<NcActionButton close-after-click
				@click="openConversationSettings">
				<template #icon>
					<Cog :size="20" />
				</template>
				{{ t('spreed', 'Conversation settings') }}
			</NcActionButton>
		</NcActions>
	</div>
</template>

<script>
import Cog from 'vue-material-design-icons/Cog.vue'
import DotsCircle from 'vue-material-design-icons/DotsCircle.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import File from 'vue-material-design-icons/File.vue'
import Fullscreen from 'vue-material-design-icons/Fullscreen.vue'
import FullscreenExit from 'vue-material-design-icons/FullscreenExit.vue'
import HandBackLeft from 'vue-material-design-icons/HandBackLeft.vue'
import MicrophoneOff from 'vue-material-design-icons/MicrophoneOff.vue'
import RecordCircle from 'vue-material-design-icons/RecordCircle.vue'
import StopIcon from 'vue-material-design-icons/Stop.vue'
import VideoIcon from 'vue-material-design-icons/Video.vue'
import PromotedView from 'vue-material-design-icons/ViewGallery.vue'
import GridView from 'vue-material-design-icons/ViewGrid.vue'

import { showWarning } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { t } from '@nextcloud/l10n'

import NcActionButton from '@nextcloud/vue/dist/Components/NcActionButton.js'
import NcActionLink from '@nextcloud/vue/dist/Components/NcActionLink.js'
import NcActions from '@nextcloud/vue/dist/Components/NcActions.js'
import NcActionSeparator from '@nextcloud/vue/dist/Components/NcActionSeparator.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcLoadingIcon from '@nextcloud/vue/dist/Components/NcLoadingIcon.js'
import { useHotKey } from '@nextcloud/vue/dist/Composables/useHotKey.js'
import Tooltip from '@nextcloud/vue/dist/Directives/Tooltip.js'

import TransitionExpand from '../MediaSettings/TransitionExpand.vue'

import { useIsInCall } from '../../composables/useIsInCall.js'
import { CALL, CONVERSATION, PARTICIPANT } from '../../constants.js'
import { getTalkConfig } from '../../services/CapabilitiesManager.ts'
import { useBreakoutRoomsStore } from '../../stores/breakoutRooms.ts'
import { generateAbsoluteUrl } from '../../utils/handleUrl.ts'
import { callParticipantCollection } from '../../utils/webrtc/index.js'

const AUTO_LOWER_HAND_THRESHOLD = 3000
const disableKeyboardShortcuts = OCP.Accessibility.disableKeyboardShortcuts()

export default {
	name: 'TopBarMenu',

	components: {
		TransitionExpand,
		NcActionButton,
		NcActionLink,
		NcActionSeparator,
		NcActions,
		NcButton,
		NcLoadingIcon,
		// Icons
		Cog,
		DotsCircle,
		DotsHorizontal,
		File,
		Fullscreen,
		FullscreenExit,
		GridView,
		HandBackLeft,
		MicrophoneOff,
		PromotedView,
		RecordCircle,
		StopIcon,
		VideoIcon,
	},

	directives: {
		Tooltip,
	},

	props: {
		/**
		 * The conversation token
		 */
		token: {
			type: String,
			required: true,
		},

		/**
		 * The local media model
		 */
		model: {
			type: Object,
			required: true,
		},

		showActions: {
			type: Boolean,
			default: true,
		},

		/**
		 * In the sidebar the conversation settings are hidden
		 */
		isSidebar: {
			type: Boolean,
			default: false,
		},
	},

	emits: ['open-breakout-rooms-editor'],

	setup() {
		return {
			isInCall: useIsInCall(),
			breakoutRoomsStore: useBreakoutRoomsStore(),
		}
	},

	data() {
		return {
			boundaryElement: document.querySelector('.main-view'),
			lowerHandTimeout: null,
			speakingTimestamp: null,
			lowerHandDelay: AUTO_LOWER_HAND_THRESHOLD,
		}
	},

	computed: {
		conversation() {
			return this.$store.getters.conversation(this.token) || this.$store.getters.dummyConversation
		},

		isFullscreen() {
			return this.$store.getters.isFullscreen()
		},

		labelFullscreen() {
			return this.isFullscreen
				? t('spreed', 'Exit full screen (F)')
				: t('spreed', 'Full screen (F)')
		},

		isFileConversation() {
			return this.conversation.objectType === CONVERSATION.OBJECT_TYPE.FILE && this.conversation.objectId
		},

		linkToFile() {
			return this.isFileConversation
				? generateAbsoluteUrl('/f/{objectId}', { objectId: this.conversation.objectId })
				: ''
		},

		isOneToOneConversation() {
			return this.conversation.type === CONVERSATION.TYPE.ONE_TO_ONE
				|| this.conversation.type === CONVERSATION.TYPE.ONE_TO_ONE_FORMER
		},

		container() {
			return this.$store.getters.getMainContainerSelector()
		},

		changeViewText() {
			return this.isGrid
				? t('spreed', 'Speaker view')
				: t('spreed', 'Grid view')
		},

		isGrid() {
			return this.$store.getters.isGrid
		},

		isVirtualBackgroundAvailable() {
			return this.model.attributes.virtualBackgroundAvailable
		},

		isVirtualBackgroundEnabled() {
			return this.model.attributes.virtualBackgroundEnabled
		},

		isHandRaised() {
			return this.model.attributes.raisedHand?.state === true
		},

		raiseHandButtonLabel() {
			if (!this.isHandRaised) {
				return disableKeyboardShortcuts
					? t('spreed', 'Raise hand')
					: t('spreed', 'Raise hand (R)')
			}
			return disableKeyboardShortcuts
				? t('spreed', 'Lower hand')
				: t('spreed', 'Lower hand (R)')
		},

		participantType() {
			return this.conversation.participantType
		},

		canFullModerate() {
			return this.participantType === PARTICIPANT.TYPE.OWNER || this.participantType === PARTICIPANT.TYPE.MODERATOR
		},

		canModerate() {
			return this.canFullModerate || this.participantType === PARTICIPANT.TYPE.GUEST_MODERATOR
		},

		canModerateRecording() {
			return this.canFullModerate && (getTalkConfig(this.token, 'call', 'recording') || false)
		},

		canConfigureBreakoutRooms() {
			if (this.conversation.type !== CONVERSATION.TYPE.GROUP || !this.canFullModerate) {
				return false
			}

			return !!getTalkConfig(this.token, 'call', 'breakout-rooms')
		},

		isStartingRecording() {
			return this.conversation.callRecording === CALL.RECORDING.VIDEO_STARTING
				|| this.conversation.callRecording === CALL.RECORDING.AUDIO_STARTING
		},

		isRecording() {
			return this.conversation.callRecording === CALL.RECORDING.VIDEO
				|| this.conversation.callRecording === CALL.RECORDING.AUDIO
		},

		// True if current conversation is a breakout room and the breakout room has started
		// And a call is in progress
		userIsInBreakoutRoomAndInCall() {
			return this.conversation.objectType === CONVERSATION.OBJECT_TYPE.BREAKOUT_ROOM
				&& this.isInCall
		},

		showCallLayoutSwitch() {
			return !this.$store.getters.isEmptyCallView
		},
	},

	watch: {
		'model.attributes.speaking'(speaking) {
			// user stops speaking in lowerHandTimeout
			if (this.lowerHandTimeout !== null && !speaking) {
				this.lowerHandDelay = Math.max(0, this.lowerHandDelay - (Date.now() - this.speakingTimestamp))
				clearTimeout(this.lowerHandTimeout)
				this.lowerHandTimeout = null

				return
			}

			// user is not speaking OR timeout is already running OR hand is not raised
			if (!speaking || this.lowerHandTimeout !== null || !this.isHandRaised) {
				return
			}

			this.speakingTimestamp = Date.now()
			this.lowerHandTimeout = setTimeout(() => {
				this.lowerHandTimeout = null
				this.speakingTimestamp = null
				this.lowerHandDelay = AUTO_LOWER_HAND_THRESHOLD

				if (this.isHandRaised) {
					this.toggleHandRaised()
				}
			}, this.lowerHandDelay)
		},
	},

	created() {
		useHotKey('r', this.toggleHandRaised)
		useHotKey('f', this.toggleFullscreen)
	},

	methods: {
		t,
		forceMuteOthers() {
			callParticipantCollection.callParticipantModels.value.forEach(callParticipantModel => {
				callParticipantModel.forceMute()
			})
		},

		toggleFullscreen() {
			if (this.isSidebar) {
				return
			}

			// Don't toggle fullscreen if there is an open modal
			// FIXME won't be needed without Fulscreen API
			if (Array.from(document.body.childNodes).filter(child => {
				return child.nodeName === 'DIV' && child.classList.contains('modal-mask')
					&& window.getComputedStyle(child).display !== 'none'
			}).length !== 0) {
				showWarning(t('spreed', 'You need to close a dialog to toggle full screen'))
				return
			}

			if (this.isFullscreen) {
				this.disableFullscreen()
				this.$store.dispatch('setIsFullscreen', false)
			} else {
				this.enableFullscreen()
				this.$store.dispatch('setIsFullscreen', true)
			}
		},

		enableFullscreen() {
			const fullscreenElem = document.getElementById('content-vue')

			if (fullscreenElem.requestFullscreen) {
				fullscreenElem.requestFullscreen()
			} else if (fullscreenElem.webkitRequestFullscreen) {
				fullscreenElem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
			} else if (fullscreenElem.mozRequestFullScreen) {
				fullscreenElem.mozRequestFullScreen()
			} else if (fullscreenElem.msRequestFullscreen) {
				fullscreenElem.msRequestFullscreen()
			}
		},

		disableFullscreen() {
			if (document.exitFullscreen) {
				document.exitFullscreen()
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen()
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen()
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen()
			}
		},

		changeView() {
			this.$store.dispatch('setCallViewMode', { isGrid: !this.isGrid, clearLast: false })
			this.$store.dispatch('selectedVideoPeerId', null)
		},

		showMediaSettingsDialog() {
			emit('talk:media-settings:show')
		},

		toggleHandRaised() {
			if (!this.isInCall) {
				return
			}
			const newState = !this.isHandRaised
			this.model.toggleHandRaised(newState)
			this.$store.dispatch(
				'setParticipantHandRaised',
				{
					sessionId: this.$store.getters.getSessionId(),
					raisedHand: this.model.attributes.raisedHand,
				}
			)
			// If the current conversation is a break-out room and the user is not a moderator,
			// also send request for assistance to the moderators.
			if (this.userIsInBreakoutRoomAndInCall && !this.canModerate) {
				const hasRaisedHands = Object.keys(this.$store.getters.participantRaisedHandList)
					.filter(sessionId => sessionId !== this.$store.getters.getSessionId())
					.length !== 0
				if (hasRaisedHands) {
					return // Assistance is already requested by someone in the room
				}
				const hasAssistanceRequested = this.conversation.breakoutRoomStatus === CONVERSATION.BREAKOUT_ROOM_STATUS.STATUS_ASSISTANCE_REQUESTED
				if (newState && !hasAssistanceRequested) {
					this.breakoutRoomsStore.requestAssistance(this.token)
				} else if (!newState && hasAssistanceRequested) {
					this.breakoutRoomsStore.dismissRequestAssistance(this.token)
				}
			}
		},

		openConversationSettings() {
			emit('show-conversation-settings', { token: this.token })
		},

		startRecording() {
			this.$store.dispatch('startCallRecording', {
				token: this.token,
				callRecording: CALL.RECORDING.VIDEO,
			})
		},

		stopRecording() {
			this.$store.dispatch('stopCallRecording', {
				token: this.token,
			})
		},
	},
}
</script>

<style lang="scss" scoped>
.top-bar__wrapper {
	display: flex;
}
</style>
