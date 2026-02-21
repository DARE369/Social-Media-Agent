/**
 * @deprecated XState machine superseded by generationPipeline.js
 * Remove after pipeline integration is verified in production.
 */
// SocialMediaAgent/src/pages/GeneratePage/state/generationMachine.js
import { setup, assign } from "xstate";

export const generationMachine = setup({
  types: {
    context: {},
    events: {}
  },
  // 1. Declare the actor here so the machine knows it exists
  actors: {
    callStartGeneration: {} 
  },
  guards: {
    canModify: ({ context }) => (context.iteration_index < context.max_iterations),
    isAtMaxIter: ({ context }) => (context.iteration_index >= context.max_iterations)
  }
}).createMachine({
  id: "generation",
  initial: "idle",
  context: {
    iteration_index: 0,
    max_iterations: 3,
    generationId: null,
    error: null,
    metadata: {},
  },
  states: {
    idle: {
      on: {
        START_GENERATE: "submitting",
        START_MODIFY: [{ guard: "canModify", target: "draftingModification" }],
      }
    },
    draftingModification: {
      on: {
        SUBMIT_MOD: "submitting",
        CANCEL: "idle"
      }
    },
    submitting: {
      invoke: {
        // 2. Reference the declared actor by key
        src: "callStartGeneration",
        input: ({ event }) => event.payload, 
        
        onDone: {
          target: "streaming",
          actions: assign({
            generationId: ({ event }) => event.output.generation_id,
            iteration_index: ({ context }) => context.iteration_index + 1
          })
        },
        onError: {
          target: "error",
          actions: assign({ error: ({ event }) => event.error })
        }
      }
    },
    streaming: {
      on: {
        STREAM_COMPLETE: [
          { guard: "isAtMaxIter", target: "locked" },
          { target: "completed" }
        ],
        STREAM_ERROR: "error"
      }
    },
    completed: {
      on: {
        START_MODIFY: [{ guard: "canModify", target: "draftingModification" }, { target: "locked" }],
        START_GENERATE: "submitting"
      }
    },
    locked: {
      on: {
        START_GENERATE: "submitting"
      }
    },
    error: {
      on: {
        START_GENERATE: "submitting",
        RETRY: "submitting",
        CANCEL: "idle"
      }
    }
  }
});
