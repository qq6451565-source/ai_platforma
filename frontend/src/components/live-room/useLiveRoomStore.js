import { create } from "zustand";

const mergeParticipants = (incoming, previous) => {
  const prevById = new Map(previous.map((participant) => [participant.id, participant]));

  return incoming.map((participant) => {
    const existing = prevById.get(participant.id);

    return {
      ...existing,
      ...participant,
      isVerified: participant.isVerified ?? existing?.isVerified ?? false,
      isRequestingToSpeak:
        participant.isRequestingToSpeak ?? existing?.isRequestingToSpeak ?? false,
    };
  });
};

export const useLiveRoomStore = create((set, get) => ({
  participants: [],
  activeSpeakerId: null,
  teacherId: null,

  setParticipants: (participants) => {
    set((state) => {
      const mergedParticipants = mergeParticipants(participants, state.participants);
      const persistedTeacherExists = mergedParticipants.some(
        (participant) => participant.id === state.teacherId
      );
      const detectedTeacherId = persistedTeacherExists
        ? state.teacherId
        : mergedParticipants.find((participant) => participant.isTeacher)?.id ||
          mergedParticipants[0]?.id ||
          null;

      const activeSpeakerExists = mergedParticipants.some(
        (participant) => participant.id === state.activeSpeakerId
      );
      const fallbackSpeakerId = detectedTeacherId || mergedParticipants[0]?.id || null;

      return {
        participants: mergedParticipants,
        teacherId: detectedTeacherId,
        activeSpeakerId: activeSpeakerExists ? state.activeSpeakerId : fallbackSpeakerId,
      };
    });
  },

  setTeacherId: (teacherId) => {
    set((state) => ({
      teacherId,
      activeSpeakerId: state.activeSpeakerId || teacherId,
    }));
  },

  setActiveSpeaker: (participantId) => {
    const participants = get().participants;
    const isKnownParticipant = participants.some((participant) => participant.id === participantId);
    if (!isKnownParticipant) return;
    set({ activeSpeakerId: participantId });
  },

  setVerificationStatus: (participantId, status) => {
    set((state) => ({
      participants: state.participants.map((participant) =>
        participant.id === participantId
          ? { ...participant, isVerified: Boolean(status) }
          : participant
      ),
    }));
  },

  setRequestingToSpeak: (participantId, status) => {
    set((state) => ({
      participants: state.participants.map((participant) =>
        participant.id === participantId
          ? { ...participant, isRequestingToSpeak: Boolean(status) }
          : participant
      ),
    }));
  },

  resetLiveRoom: () => {
    set({
      participants: [],
      activeSpeakerId: null,
      teacherId: null,
    });
  },
}));
