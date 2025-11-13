const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const mlService = require('../services/mlService');

const router = express.Router();

// Logging middleware to log request method and path
router.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Map textual severity to numeric score for comparison
const SEVERITY_SCORE = { healthy: 0, low: 1, medium: 2, high: 3 };

// Adaptive task generator based on disease and previous day's results
function generateTasksForDisease(diseaseKey, previousOutcome = null, currentDay = 1) {
    const baseTasks = {
        inspection: [
            'Inspect plant for changes in disease symptoms',
            'Document any improvements or worsening'
        ],
        watering: [
            'Check soil moisture and water if dry',
            'Ensure proper drainage; avoid waterlogging'
        ],
        light: [
            'Provide bright, indirect sunlight for 4-6 hours'
        ],
        hygiene: [
            'Wipe leaves gently to remove debris',
            'Sterilize tools before use'
        ],
        fungicide: [
            'Apply fungicide as directed (spot treat affected areas)'
        ],
        nutrition: [
            'Apply appropriate plant nutrients if needed',
            'Check for nutrient deficiencies'
        ],
        pruning: [
            'Remove severely affected leaves if necessary',
            'Dispose of removed leaves properly'
        ]
    };

    // Adaptive logic based on previous outcome
    const getTasksForDay = (day, outcome) => {
        // Day 1 always starts with basic treatment
        if (day === 1) {
            switch(diseaseKey) {
                case 'leaf_spot':
                    return ['fungicide', 'hygiene', 'light'];
                case 'root_rot':
                    return ['watering', 'hygiene', 'light'];
                default:
                    return ['watering', 'light', 'hygiene'];
            }
        }
        
        // Adaptive tasks based on previous day's outcome
        switch(outcome) {
            case 'improved':
                // Continue with lighter maintenance
                return ['inspection', 'hygiene', 'light'];
            case 'worsened':
                // Intensify treatment
                return ['inspection', 'fungicide', 'pruning', 'hygiene'];
            case 'same':
            default:
                // Continue current treatment
                return ['inspection', 'fungicide', 'hygiene', 'light'];
        }
    };

    const timingFor = (text) => {
        const t = text.toLowerCase();
        if (t.includes('fungicide')) return 'Evening';
        if (t.includes('water')) return 'Morning';
        if (t.includes('sun') || t.includes('light')) return 'Morning';
        if (t.includes('inspect')) return 'Morning';
        return 'Anytime';
    };

    // Generate tasks for the current day based on previous outcome
    const categories = getTasksForDay(currentDay, previousOutcome);
    const tasks = [];
    
    categories.forEach(cat => {
        if (baseTasks[cat]) {
            tasks.push(...baseTasks[cat]);
        }
    });

    const dayTasks = tasks.map(text => ({ id: uuidv4(), text, timing: timingFor(text), completed: false }));
    
    return {
        day: currentDay,
        tasks: dayTasks,
        notes: '',
        completed: false,
        completedAt: null,
        collapsed: false
    };
}

function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

function normalizePrediction(prediction, source, fallback = {}) {
    const data = prediction || {};
    const fallbackData = fallback || {};
    const diseaseKey = data.diseaseKey || data.disease_key || fallbackData.diseaseKey || fallbackData.disease_key || null;
    const disease = data.disease || data.disease_name || fallbackData.disease || fallbackData.disease_name || fallbackData.diseaseName || 'Unknown';
    const rawSeverity = data.severity || fallbackData.severity || fallbackData.disease_severity || 'medium';
    const severity = typeof rawSeverity === 'string' ? rawSeverity.toLowerCase() : 'medium';
    const status = data.status || fallbackData.status || null;
    const confidence = data.confidence ?? fallbackData.confidence ?? null;
    const description = data.description || fallbackData.description || null;
    const causes = toArray(data.causes);
    const treatments = toArray(data.treatments);
    const prevention = toArray(data.prevention);
    const fallbackCauses = toArray(fallbackData.causes);
    const fallbackTreatments = toArray(fallbackData.treatments);
    const fallbackPrevention = toArray(fallbackData.prevention);
    const normalizedCauses = causes.length ? causes : fallbackCauses;
    const normalizedTreatments = treatments.length ? treatments : fallbackTreatments;
    const normalizedPrevention = prevention.length ? prevention : fallbackPrevention;
    const allPredictions = data.all_predictions || data.allPredictions || fallbackData.all_predictions || fallbackData.allPredictions || null;
    return {
        diseaseKey,
        disease,
        severity,
        status,
        confidence,
        description,
        causes: normalizedCauses,
        treatments: normalizedTreatments,
        prevention: normalizedPrevention,
        allPredictions,
        source
    };
}

// Create a treatment plan from an analysis
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { analysisId, diseaseKey, diseaseName, imageUrl, potName } = req.body;
        if (!analysisId || !diseaseKey || !diseaseName || !imageUrl) {
            return res.status(400).json({ success: false, message: 'analysisId, diseaseKey, diseaseName, imageUrl are required' });
        }
        if (diseaseKey === 'healthy' || /healthy/i.test(diseaseName)) {
            return res.status(400).json({ success: false, message: 'Healthy analyses do not require treatment plans' });
        }

        const now = new Date();
        const plan = {
            planId: `plan_${uuidv4()}`,
            userId: req.user.userId,
            analysisId,
            diseaseKey,
            diseaseName,
            potName: potName || 'Unnamed Pot',
            status: 'active', // active | completed_success | leaf_removal_recommended
            createdAt: now,
            updatedAt: now,
            beforePhotoUrl: imageUrl,
            afterPhotoUrl: null,
            remindersEnabled: false,
            progression: [], // array of { date, notes, severity }
            days: [generateTasksForDisease(diseaseKey, null, 1)]
        };

        const saved = await database.createTreatmentPlan(plan);
        return res.json({ success: true, data: saved });
    } catch (err) {
        console.error('Create treatment plan error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create treatment plan' });
    }
});

// Get plans for current user (optionally by status)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const plans = await database.getTreatmentPlansByUser(req.user.userId, status);
        return res.json({ success: true, data: plans });
    } catch (err) {
        console.error('List treatment plans error:', err);
        return res.status(500).json({ success: false, message: 'Failed to list treatment plans' });
    }
});

// Get plans linked to an analysis
router.get('/by-analysis/:analysisId', authMiddleware, async (req, res) => {
    try {
        const plans = await database.getTreatmentPlansByAnalysis(req.user.userId, req.params.analysisId);
        return res.json({ success: true, data: plans });
    } catch (err) {
        console.error('Get plans by analysis error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch plans' });
    }
});

// Get single plan by id
router.get('/:planId', authMiddleware, async (req, res) => {
    try {
        console.log('Fetching treatment plan:', req.params.planId, 'for user:', req.user.userId);
        const plan = await database.getTreatmentPlanById(req.user.userId, req.params.planId);
        if (!plan) {
            console.log('Plan not found for user:', req.user.userId, 'planId:', req.params.planId);
            // Check if plan exists for any user (debug)
            const anyPlan = await database.db.collection('treatment_plans').findOne({ plan_id: req.params.planId });
            console.log('Plan exists for any user:', !!anyPlan, anyPlan ? 'user_id: ' + anyPlan.user_id : '');
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        return res.json({ success: true, data: plan });
    } catch (err) {
        console.error('Get plan error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch plan' });
    }
});

// Toggle task completion for a day
router.patch('/:planId/day/:dayNumber/task/:taskId', authMiddleware, async (req, res) => {
    try {
        const { planId, dayNumber, taskId } = { ...req.params };
        const updated = await database.toggleTreatmentTask(req.user.userId, planId, parseInt(dayNumber, 10), taskId);
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Toggle task error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update task' });
    }
});

// Attach after photo URL (frontend uploads via /api/upload first)
router.post('/:planId/after-photo', authMiddleware, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl required' });
        const updated = await database.setTreatmentAfterPhoto(req.user.userId, req.params.planId, imageUrl);
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Set after photo error:', err);
        return res.status(500).json({ success: false, message: 'Failed to set after photo' });
    }
});

// Save notes for a specific day
router.patch('/:planId/day/:dayNumber/notes', authMiddleware, async (req, res) => {
    try {
        const { notes } = req.body;
        const updated = await database.saveTreatmentDayNotes(req.user.userId, req.params.planId, parseInt(req.params.dayNumber, 10), notes || '');
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Save notes error:', err);
        return res.status(500).json({ success: false, message: 'Failed to save notes' });
    }
});

// Toggle reminders on/off
router.patch('/:planId/reminders', authMiddleware, async (req, res) => {
    try {
        const { enabled } = req.body;
        const updated = await database.setTreatmentReminders(req.user.userId, req.params.planId, !!enabled);
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('Set reminders error:', err);
        return res.status(500).json({ success: false, message: 'Failed to update reminders' });
    }
});

// Evaluate improvement by comparing before vs after using ML service
router.post('/:planId/evaluate', authMiddleware, async (req, res) => {
    try {
        console.log('Evaluating treatment plan:', req.params.planId, 'for user:', req.user.userId);
        const plan = await database.getTreatmentPlanById(req.user.userId, req.params.planId);
        if (!plan) {
            console.log('Plan not found for evaluation');
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }
        const planId = plan.plan_id || plan.planId || req.params.planId;

        // Allow passing after photo URL in request body to avoid race conditions right after upload
        const providedAfterUrl = req.body && (req.body.imageUrl || req.body.afterPhotoUrl);
        const afterUrl = providedAfterUrl || plan.after_photo_url || plan.afterPhotoUrl;
        console.log('After URL:', afterUrl, 'Provided in body:', !!providedAfterUrl);

        if (!afterUrl) {
            console.log('No after photo URL available');
            return res.status(400).json({ success: false, message: 'After photo not set' });
        }

        // Allow daily rescans instead of 7-day window restriction
        const MS_IN_DAY = 24 * 60 * 60 * 1000;
        const totalDays = Array.isArray(plan.days) && plan.days.length > 0 ? plan.days.length : 7;
        const cycleStart = plan.cycle_started_at || plan.created_at || plan.updated_at;
        const elapsedDays = cycleStart ? Math.floor((Date.now() - new Date(cycleStart).getTime()) / MS_IN_DAY) : 0;
        const allDaysCompleted = Array.isArray(plan.days) && plan.days.length >= totalDays && plan.days.every(d => d.completed);

        console.log('Evaluation timing check:', {
            totalDays,
            elapsedDays,
            allDaysCompleted,
            cycleStart: cycleStart ? new Date(cycleStart).toISOString() : null
        });

        // Allow evaluation at any time for daily rescans
        // Remove the timing restriction that prevented evaluation before completing all days

        console.log('Calling ML service for before photo:', plan.before_photo_url || plan.beforePhotoUrl);
        let before = null;
        let after = null;
        let beforeSource = 'fallback';
        let afterSource = 'fallback';

        try {
            before = await mlService.predictFromUrl(plan.before_photo_url || plan.beforePhotoUrl || plan.beforePhotoURL || plan.beforePhoto);
            if (before) {
                beforeSource = 'ml';
                console.log('Before prediction result:', before);
            }
        } catch (mlErr) {
            console.log('ML before prediction error:', mlErr.message);
        }

        try {
            after = await mlService.predictFromUrl(afterUrl);
            if (after) {
                afterSource = 'ml';
                console.log('After prediction result:', after);
            }
        } catch (mlErr) {
            console.log('ML after prediction error:', mlErr.message);
        }

        if (!before && plan.analysis_id) {
            const originalAnalysis = await database.getAnalysisById(plan.analysis_id);
            if (originalAnalysis) {
                before = originalAnalysis;
                beforeSource = 'analysis';
                console.log('Using analysis history as fallback for before prediction');
            }
        }

        if (!before) {
            const fallbackSeverity = (plan.disease_severity || plan.severity || 'medium').toLowerCase();
            before = {
                diseaseKey: plan.disease_key || plan.diseaseKey || null,
                disease: plan.disease_name || plan.diseaseName || 'Unknown',
                severity: fallbackSeverity,
                status: plan.status || null,
                confidence: plan.confidence ?? null,
                description: plan.description || null,
                causes: plan.causes || [],
                treatments: plan.treatments || [],
                prevention: plan.prevention || []
            };
            beforeSource = 'plan';
            console.log('Using plan data as fallback for before prediction');
        }

        if (!after && Array.isArray(plan.evaluations) && plan.evaluations.length > 0) {
            const lastEval = plan.evaluations[plan.evaluations.length - 1];
            if (lastEval?.after) {
                after = lastEval.after;
                afterSource = 'previous_evaluation';
                console.log('Using previous evaluation as fallback for after prediction');
            }
        }

        if (!after) {
            after = {
                disease: before.disease,
                severity: before.severity,
                confidence: before.confidence ?? 0
            };
            afterSource = 'fallback';
            console.log('Defaulting after prediction to before data');
        }

        const planFallback = {
            diseaseKey: plan.disease_key || plan.diseaseKey || null,
            disease: plan.disease_name || plan.diseaseName || 'Unknown',
            severity: plan.disease_severity || plan.severity || 'medium',
            status: plan.status || null,
            confidence: plan.confidence ?? null,
            description: plan.description || null,
            causes: plan.causes || [],
            treatments: plan.treatments || [],
            prevention: plan.prevention || []
        };

        const beforeDetail = normalizePrediction(before, beforeSource, planFallback);
        const afterDetail = normalizePrediction(after, afterSource, beforeDetail);
        const beforeScore = SEVERITY_SCORE[beforeDetail.severity] ?? 2;
        const afterScore = SEVERITY_SCORE[afterDetail.severity] ?? 2;

        console.log('Severity scores:', { beforeScore, afterScore, beforeSeverity: beforeDetail.severity, afterSeverity: afterDetail.severity });

        let outcome = 'same';
        if (afterScore < beforeScore) outcome = 'improved';
        else if (afterScore > beforeScore) outcome = 'worsened';

        console.log('Evaluation outcome:', outcome);

        const evaluation = {
            evaluatedAt: new Date(),
            outcome,
            scores: { before: beforeScore, after: afterScore },
            before: beforeDetail,
            after: afterDetail
        };

        const diseaseKeyForCycle = plan.disease_key || plan.diseaseKey || afterDetail.diseaseKey || beforeDetail.diseaseKey || 'leaf_spot';

        console.log('outcome:', outcome, 'diseaseKeyForCycle:', diseaseKeyForCycle);

        let updatedPlan;
        if (outcome === 'improved' || afterDetail.diseaseKey === 'healthy' || afterDetail.status === 'healthy') {
            console.log('Completing plan as successful');
            updatedPlan = await database.completeTreatmentPlan(req.user.userId, planId, 'completed_success', evaluation);
            console.log('Updated plan status:', updatedPlan?.status);
        } else if (outcome === 'worsened') {
            console.log('Recommending leaf removal and continuing treatment');
            updatedPlan = await database.completeTreatmentPlan(req.user.userId, planId, 'leaf_removal_recommended', evaluation);
            console.log('Updated plan status:', updatedPlan?.status);
        } else {
            // For 'same' outcome, add next day's tasks and continue treatment
            console.log('Adding next day tasks for same outcome:', outcome);
            const currentDay = Array.isArray(plan.days) ? plan.days.length : 1;
            const nextDayTasks = generateTasksForDisease(diseaseKeyForCycle, outcome, currentDay + 1);
            
            const updatedDays = Array.isArray(plan.days) ? [...plan.days, nextDayTasks] : [nextDayTasks];
            
            // Update the plan with the new day's tasks
            const collection = database.db.collection('treatment_plans');
            updatedPlan = await collection.findOneAndUpdate(
                { user_id: req.user.userId, plan_id: planId },
                {
                    $set: {
                        days: updatedDays,
                        updated_at: new Date(),
                        status: 'active' // Keep plan active for daily continuation
                    },
                    $push: { evaluations: evaluation }
                },
                { returnDocument: 'after' }
            );
            updatedPlan = updatedPlan.value;
            console.log('Added day', currentDay + 1, 'tasks, total days:', updatedDays.length);
        }

        console.log('Evaluation completed successfully');
        return res.json({ success: true, data: updatedPlan, evaluation });
    } catch (err) {
        console.error('Evaluate plan error:', err);
        console.error('Error stack:', err.stack);
        return res.status(500).json({ success: false, message: 'Failed to evaluate plan: ' + err.message });
    }
});

module.exports = router;


