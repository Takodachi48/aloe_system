const express = require('express');
const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const MLService = require('../services/mlService');

const router = express.Router();

// Map textual severity to numeric score for comparison
const SEVERITY_SCORE = { healthy: 0, low: 1, medium: 2, high: 3 };

// Basic disease-specific task generator (can be expanded)
function generateTasksForDisease(diseaseKey) {
    const baseTasks = {
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
        ]
    };

    const diseasePresets = {
        healthy: [
            ['watering'], ['light'], ['hygiene'], ['watering'], ['light'], ['hygiene'], ['inspection']
        ],
        leaf_spot: [
            ['fungicide', 'hygiene'], ['light'], ['watering'], ['fungicide'], ['hygiene'], ['light'], ['inspection']
        ],
        root_rot: [
            ['watering'], ['hygiene'], ['light'], ['watering'], ['fungicide'], ['light'], ['inspection']
        ]
    };

    const timingFor = (text) => {
        const t = text.toLowerCase();
        if (t.includes('fungicide')) return 'Evening';
        if (t.includes('water')) return 'Morning';
        if (t.includes('sun') || t.includes('light')) return 'Morning';
        return 'Anytime';
    };

    const plan = (diseasePresets[diseaseKey] || diseasePresets.leaf_spot).map((categories, idx) => {
        const tasks = [];
        categories.forEach(cat => {
            if (cat === 'inspection') {
                tasks.push('Final inspection and prepare for rescan');
            } else if (baseTasks[cat]) {
                tasks.push(...baseTasks[cat]);
            }
        });
        const dayTasks = tasks.map(text => ({ id: uuidv4(), text, timing: timingFor(text), completed: false }));
        return {
            day: idx + 1,
            tasks: dayTasks,
            notes: '',
            completed: false,
            completedAt: null,
            collapsed: false
        };
    });

    return plan;
}

// Create a treatment plan from an analysis
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { analysisId, diseaseKey, diseaseName, imageUrl } = req.body;
        if (!analysisId || !diseaseKey || !diseaseName || !imageUrl) {
            return res.status(400).json({ success: false, message: 'analysisId, diseaseKey, diseaseName, imageUrl are required' });
        }
        if (diseaseKey === 'healthy' || /healthy/i.test(diseaseName)) {
            return res.status(400).json({ success: false, message: 'Healthy analyses do not require treatment plans' });
        }

        const plan = {
            planId: `plan_${uuidv4()}`,
            userId: req.user.userId,
            analysisId,
            diseaseKey,
            diseaseName,
            cycle: 1,
            status: 'active', // active | completed_success | leaf_removal_recommended
            createdAt: new Date(),
            updatedAt: new Date(),
            beforePhotoUrl: imageUrl,
            afterPhotoUrl: null,
            remindersEnabled: false,
            progression: [], // array of { date, notes, severity }
            days: generateTasksForDisease(diseaseKey)
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
        const plan = await database.getTreatmentPlanById(req.user.userId, req.params.planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
        // Allow passing after photo URL in request body to avoid race conditions right after upload
        const providedAfterUrl = req.body && (req.body.imageUrl || req.body.afterPhotoUrl);
        const afterUrl = providedAfterUrl || plan.after_photo_url || plan.afterPhotoUrl;
        if (!afterUrl) return res.status(400).json({ success: false, message: 'After photo not set' });

        const ml = new MLService();
        // Use URL prediction for simplicity
        const before = await ml.predictFromUrl(plan.before_photo_url || plan.beforePhotoUrl || plan.beforePhotoURL || plan.beforePhoto);
        const after = await ml.predictFromUrl(afterUrl);
        if (!before?.success || !after?.success) {
            return res.status(502).json({ success: false, message: 'ML service error' });
        }

        const beforeData = before.data;
        const afterData = after.data;
        const beforeScore = SEVERITY_SCORE[beforeData.severity] ?? 2;
        const afterScore = SEVERITY_SCORE[afterData.severity] ?? 2;

        let outcome = 'same';
        if (afterScore < beforeScore) outcome = 'improved';
        else if (afterScore > beforeScore) outcome = 'worsened';

        const evaluation = {
            evaluatedAt: new Date(),
            before: { disease: beforeData.disease, severity: beforeData.severity, confidence: beforeData.confidence },
            after: { disease: afterData.disease, severity: afterData.severity, confidence: afterData.confidence },
            outcome
        };

        // Update plan based on outcome
        let updatedPlan;
        if (outcome === 'improved' || (afterData.severity === 'healthy')) {
            updatedPlan = await database.completeTreatmentPlan(req.user.userId, plan.planId, 'completed_success', evaluation);
        } else if (outcome === 'worsened') {
            if (plan.cycle === 1) {
                // Start a new cycle with different tasks
                const newDays = generateTasksForDisease(plan.diseaseKey).map(d => ({ ...d }));
                updatedPlan = await database.startSecondCycle(req.user.userId, plan.planId, newDays, evaluation);
            } else {
                // Recommend leaf removal
                updatedPlan = await database.completeTreatmentPlan(req.user.userId, plan.planId, 'leaf_removal_recommended', evaluation);
            }
        } else {
            // No change: if first cycle, keep active; if second cycle, recommend removal
            if (plan.cycle === 1) {
                updatedPlan = await database.appendEvaluation(req.user.userId, plan.planId, evaluation);
            } else {
                updatedPlan = await database.completeTreatmentPlan(req.user.userId, plan.planId, 'leaf_removal_recommended', evaluation);
            }
        }

        return res.json({ success: true, data: updatedPlan, evaluation });
    } catch (err) {
        console.error('Evaluate plan error:', err);
        return res.status(500).json({ success: false, message: 'Failed to evaluate plan' });
    }
});

module.exports = router;


