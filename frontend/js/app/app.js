import { AppState } from '../core/state.js';
import { Elements } from '../core/elements.js';
import { checkAuthentication } from '../services/auth.js';
import { initHeader, updateUserDisplay } from './components/header.js';
import { initSidebar } from './components/sidebar.js';
import { analyzeImage, initCamera } from './pages/analyze.js';
import { loadHistoryPage, viewAnalysis, deleteAnalysis } from './pages/history.js';
import { generateDiseaseGuide } from './pages/diseases.js';
import { initSettingsPage, loadDarkModeSetting } from './pages/settings.js';
import { initWeatherPage } from './pages/weather.js';
import { initTreatmentPlansUI } from './pages/treatmentPlans.js';
import { updateHeaderForPage } from '../utils/navigation.js';
import { 
    handleDragOver, 
    handleDragLeave, 
    handleDrop, 
    handleFileSelect, 
    clearImage 
} from '../utils/file-handler.js';

class AloeShieldApp {
    constructor() {
        this.initialized = false;
    }

    async init() {
        try {
            console.log('Initializing AloeShield Application...');
            
            loadDarkModeSetting();
            
            const authenticated = await checkAuthentication();
            if (!authenticated) return;

            this.setupEventListeners();
            this.setupComponents();
            
            this.initialized = true;
            console.log('AloeShield Application Initialized Successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }

    setupEventListeners() {
        if (Elements.uploadArea) {
            Elements.uploadArea.addEventListener('dragover', handleDragOver);
            Elements.uploadArea.addEventListener('dragleave', handleDragLeave);
            Elements.uploadArea.addEventListener('drop', handleDrop);
            // Upload area click functionality removed - only Select Image button triggers file input now
        }

        if (Elements.fileInput) {
            Elements.fileInput.addEventListener('change', handleFileSelect);
        }

        if (Elements.selectImageBtn) {
            Elements.selectImageBtn.addEventListener('click', () => {
                if (Elements.fileInput) Elements.fileInput.click();
            });
        }

        if (Elements.analyzeBtn) {
            Elements.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        }

        if (Elements.clearBtn) {
            Elements.clearBtn.addEventListener('click', () => clearImage());
        }

        if (Elements.refreshHistoryBtn) {
            Elements.refreshHistoryBtn.addEventListener('click', () => loadHistoryPage(1));
        }

        if (Elements.sidebarOverlay) {
            Elements.sidebarOverlay.addEventListener('click', () => {
                if (Elements.sidebar) Elements.sidebar.classList.remove('open');
                Elements.sidebarOverlay.classList.remove('show');
            });
        }
    }

    setupComponents() {
        initHeader();
        initSidebar();
        initSettingsPage();
        initWeatherPage();
        initTreatmentPlansUI();
        initCamera();
        updateHeaderForPage('analyze');
    }

    analyzeImage() {
        analyzeImage();
    }

    loadHistoryPage(page = 1) {
        loadHistoryPage(page);
    }

    viewAnalysis(analysisId) {
        viewAnalysis(analysisId);
    }

    deleteAnalysis(analysisId) {
        deleteAnalysis(analysisId);
    }

    generateDiseaseGuide() {
        generateDiseaseGuide();
    }

    updateUserDisplay() {
        updateUserDisplay();
    }
}

window.app = new AloeShieldApp();

document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
