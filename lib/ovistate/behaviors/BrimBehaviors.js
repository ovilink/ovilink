export const BrimBehaviors = {
    TalePop: {
        name: 'Tale Pop',
        description: 'Shows a narrative message when triggered or at a specific time.',
        parameters: {
            message: { type: 'text', default: 'A new discovery!' },
            delay: { type: 'number', default: 0 },
            autoShow: { type: 'boolean', default: true }
        },
        create: (obj, params) => {
            return {
                type: 'TalePop',
                params: params,
                hasTriggered: false,
                timer: 0,
                update: function (dt, runtime) {
                    if (this.params.autoShow && !this.hasTriggered) {
                        this.timer += dt;
                        if (this.timer >= this.params.delay) {
                            this.trigger(runtime);
                        }
                    }
                },
                trigger: function (runtime) {
                    this.hasTriggered = true;
                    // Communicate with Brimtale Runtime
                    if (window.BrimRuntime) {
                        window.BrimRuntime.showNarrative(this.params.message);
                    } else {
                        console.log("Tale Pop:", this.params.message);
                    }
                }
            };
        }
    },

    DNAFill: {
        name: 'DNA Fill',
        description: 'Updates the Brim DNA Meter when interacting with this object.',
        parameters: {
            dnaType: { type: 'select', options: ['logic', 'ethics', 'strategy', 'creativity'], default: 'logic' },
            amount: { type: 'number', default: 10 },
            onTrigger: { type: 'select', options: ['click', 'hover', 'collision'], default: 'click' }
        },
        create: (obj, params) => {
            return {
                type: 'DNAFill',
                params: params,
                update: function (dt, runtime) {
                    // Logic handled by event listeners usually, 
                    // or check for collision here if implemented
                },
                onEvent: function (eventType, runtime) {
                    if (eventType === this.params.onTrigger) {
                        if (window.BrimRuntime) {
                            window.BrimRuntime.updateDNA(this.params.dnaType, this.params.amount);
                        } else {
                            console.log(`DNA Fill: ${this.params.dnaType} +${this.params.amount}`);
                        }
                    }
                }
            };
        }
    }
};

export function registerBrimBehaviors(registry) {
    registry.register('tale_pop', {
        ...BrimBehaviors.TalePop,
        category: 'interactive',
        icon: '💬'
    });

    registry.register('dna_fill', {
        ...BrimBehaviors.DNAFill,
        category: 'interactive',
        icon: '🧬'
    });
}
