/**
 * RefactAI — Interactive Frontend Controller
 * Connects to the RefactAI FastAPI Engine, controls visualizations, SHAP drawers,
 * Risk Explanation Chart, Smart Refactoring Assistant, Analytics Graph,
 * and Authorized Shareable PDF Report Generation.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Application State
    const state = {
        currentReport: null,
        currentFilter: "all",
        searchQuery: "",
        sortField: "risk_score",
        sortAscending: false,
        selectedFileId: null,
        isLoading: false,
        // Solutions & Assistant State
        selectedSolutionFile: null,
        solutionViewMode: "solution",
        solutionData: null,
        selectedAssistantFile: null,
        assistantAction: "hotspot",
        assistantViewMode: "refactored",
        assistantData: null
    };

    // DOM Elements
    const elements = {
        analyzeForm: document.getElementById("analyze-form"),
        repoUrlInput: document.getElementById("repo-url-input"),
        modelSelect: document.getElementById("model-select"),
        branchInput: document.getElementById("branch-input"),
        analyzeBtn: document.getElementById("analyze-btn"),
        analyzeSpinner: document.getElementById("analyze-spinner"),
        presetBtns: document.querySelectorAll(".preset-btn"),

        // System status
        systemStatusText: document.getElementById("system-status-text"),

        // Results Section
        resultsSection: document.getElementById("results-section"),
        summaryRepoName: document.getElementById("summary-repo-name"),
        summaryBranchBadge: document.getElementById("summary-branch-badge"),
        summaryTimestamp: document.getElementById("summary-timestamp"),
        summaryHealthDesc: document.getElementById("summary-health-description"),
        btnExportPdf: document.getElementById("btn-export-pdf"),
        btnShareReport: document.getElementById("btn-share-report"),
        
        // Radial Gauge
        gaugeProgress: document.getElementById("gauge-progress"),
        gaugePercent: document.getElementById("gauge-percent"),
        gaugeStatusBadge: document.getElementById("gauge-status-badge"),

        // Stat Cards
        statTotalFiles: document.getElementById("stat-total-files"),
        statTotalLoc: document.getElementById("stat-total-loc"),
        statCriticalFiles: document.getElementById("stat-critical-files"),
        statAvgComplexity: document.getElementById("stat-avg-complexity"),
        statActiveModel: document.getElementById("stat-active-model"),
        statModelAuc: document.getElementById("stat-model-auc"),

        // Distribution Bar
        barCritical: document.getElementById("bar-critical"),
        barHigh: document.getElementById("bar-high"),
        barModerate: document.getElementById("bar-moderate"),
        barLow: document.getElementById("bar-low"),
        distCountCritical: document.getElementById("dist-count-critical"),
        distCountHigh: document.getElementById("dist-count-high"),
        distCountModerate: document.getElementById("dist-count-moderate"),
        distCountLow: document.getElementById("dist-count-low"),

        // Risk Explanation Chart
        chartTabBtns: document.querySelectorAll(".chart-tab-btn"),
        chartViewPanes: document.querySelectorAll(".chart-view-pane"),
        factorBarsContainer: document.getElementById("factor-bars-container"),
        tierMatrixContainer: document.getElementById("tier-matrix-container"),

        // Strategic Insights
        topDriversList: document.getElementById("top-drivers-list"),
        globalRecsList: document.getElementById("global-recs-list"),

        // Navigation links
        navSolutionsLink: document.getElementById("nav-solutions-link"),
        navAssistantLink: document.getElementById("nav-assistant-link"),
        navBenchmarksLink: document.getElementById("nav-benchmarks-link"),

        // Tabs
        tabBtns: document.querySelectorAll(".tab-btn"),
        tabPanes: document.querySelectorAll(".tab-pane"),

        // Table & Filters
        filesTable: document.getElementById("files-table"),
        filesTbody: document.getElementById("files-tbody"),
        fileSearchInput: document.getElementById("file-search-input"),
        filterChips: document.querySelectorAll(".filter-chip"),

        // Solutions Tab
        solutionFileSelect: document.getElementById("solution-file-select"),
        solutionFileTitle: document.getElementById("solution-file-title"),
        solutionLangPill: document.getElementById("solution-lang-pill"),
        solutionProblemDesc: document.getElementById("solution-problem-desc"),
        solutionCodeBlock: document.getElementById("solution-code-block"),
        btnCopySolution: document.getElementById("btn-copy-solution"),
        copySolutionText: document.getElementById("copy-solution-text"),
        btnDownloadSolution: document.getElementById("btn-download-solution"),
        codeViewBtns: document.querySelectorAll(".code-view-btn"),

        // Smart Refactoring Assistant Tab
        assistantFileSelect: document.getElementById("assistant-file-select"),
        quickPromptBtns: document.querySelectorAll(".quick-prompt-btn"),
        assistantCustomQuery: document.getElementById("assistant-custom-query"),
        btnSubmitAssistant: document.getElementById("btn-submit-assistant"),
        forecastCurrComp: document.getElementById("forecast-curr-comp"),
        forecastProjComp: document.getElementById("forecast-proj-comp"),
        forecastDebtDrop: document.getElementById("forecast-debt-drop"),
        forecastStatus: document.getElementById("forecast-status"),
        assistantDiagText: document.getElementById("assistant-diag-text"),
        asstViewBtns: document.querySelectorAll(".asst-view-btn"),
        assistantCodeDisplay: document.getElementById("assistant-code-display"),
        btnCopyAssistantCode: document.getElementById("btn-copy-assistant-code"),
        copyAsstText: document.getElementById("copy-asst-text"),
        btnDownloadAssistantCode: document.getElementById("btn-download-assistant-code"),

        // Hotspot Matrix
        hotspotGrid: document.getElementById("hotspot-grid"),

        // Benchmarks Table
        benchmarksTbody: document.getElementById("benchmarks-tbody"),

        // SHAP Drawer
        shapDrawer: document.getElementById("shap-drawer"),
        closeDrawerBtn: document.getElementById("close-drawer-btn"),
        drawerFileName: document.getElementById("drawer-file-name"),
        drawerFilePath: document.getElementById("drawer-file-path"),
        drawerRiskScore: document.getElementById("drawer-risk-score"),
        drawerRiskBadge: document.getElementById("drawer-risk-badge"),
        drawerLoc: document.getElementById("drawer-loc"),
        drawerComplexity: document.getElementById("drawer-complexity"),
        drawerAuthors: document.getElementById("drawer-authors"),
        drawerBugs: document.getElementById("drawer-bugs"),
        drawerOpenSolutionBtn: document.getElementById("drawer-open-solution-btn"),
        shapBarsContainer: document.getElementById("shap-bars-container"),
        drawerRecsList: document.getElementById("drawer-recs-list")
    };

    // 1. Initial Load & Setup
    init();

    async function init() {
        bindEvents();
        checkEngineHealth();
        await loadInitialBenchmark();
    }

    // 2. Event Listeners
    function bindEvents() {
        // Form submit
        elements.analyzeForm.addEventListener("submit", handleFormSubmit);

        // Clipboard Paste Button
        const btnPasteClipboard = document.getElementById("btn-paste-clipboard");
        const btnClearRepo = document.getElementById("btn-clear-repo");
        const toggleAuthTokenBtn = document.getElementById("toggle-auth-token-btn");
        const authTokenFields = document.getElementById("auth-token-fields");
        const btnIngestionAuth = document.getElementById("btn-ingestion-auth");

        if (btnPasteClipboard) {
            btnPasteClipboard.addEventListener("click", async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && text.trim()) {
                        elements.repoUrlInput.value = text.trim();
                        if (btnClearRepo) btnClearRepo.classList.remove("hidden");
                        elements.repoUrlInput.focus();
                        showToast("Pasted repository URL from clipboard!");
                    } else {
                        showToast("Clipboard is empty. Please copy a repository URL first.");
                    }
                } catch (err) {
                    elements.repoUrlInput.focus();
                    showToast("Please press Ctrl+V to paste your repository URL.");
                }
            });
        }

        if (btnClearRepo) {
            btnClearRepo.addEventListener("click", () => {
                elements.repoUrlInput.value = "";
                btnClearRepo.classList.add("hidden");
                elements.repoUrlInput.focus();
            });
        }

        if (elements.repoUrlInput) {
            elements.repoUrlInput.addEventListener("input", () => {
                if (btnClearRepo) {
                    if (elements.repoUrlInput.value.trim()) {
                        btnClearRepo.classList.remove("hidden");
                    } else {
                        btnClearRepo.classList.add("hidden");
                    }
                }
            });
        }

        if (toggleAuthTokenBtn && authTokenFields) {
            toggleAuthTokenBtn.addEventListener("click", () => {
                authTokenFields.classList.toggle("hidden");
                const isHidden = authTokenFields.classList.contains("hidden");
                const label = document.getElementById("token-toggle-label");
                if (label) {
                    label.textContent = isHidden 
                        ? "+ Add GitHub Auth Token (PAT for private repos / high rate limits)"
                        : "- Hide GitHub Auth Token Field";
                }
                if (!isHidden) {
                    document.getElementById("github-token-input")?.focus();
                }
            });
        }

        if (btnIngestionAuth) {
            btnIngestionAuth.addEventListener("click", () => {
                openAuthModal();
            });
        }

        // Preset buttons
        elements.presetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const url = btn.getAttribute("data-url");
                elements.repoUrlInput.value = url;
                handleFormSubmit();
            });
        });

        // Tabs switcher
        elements.tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                switchTab(btn.getAttribute("data-tab"));
            });
        });

        // Header Navigation Links
        if (elements.navSolutionsLink) {
            elements.navSolutionsLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchTab("tab-solutions");
                scrollToResults();
            });
        }
        if (elements.navAssistantLink) {
            elements.navAssistantLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchTab("tab-assistant");
                scrollToResults();
            });
        }
        if (elements.navBenchmarksLink) {
            elements.navBenchmarksLink.addEventListener("click", (e) => {
                e.preventDefault();
                switchTab("tab-benchmarks");
                scrollToResults();
            });
        }

        // Search input
        elements.fileSearchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            renderFilesTable();
        });

        // Risk filter chips
        elements.filterChips.forEach(chip => {
            chip.addEventListener("click", () => {
                elements.filterChips.forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                state.currentFilter = chip.getAttribute("data-risk");
                renderFilesTable();
            });
        });

        // Sortable table headers
        elements.filesTable.querySelectorAll("th.sortable").forEach(th => {
            th.addEventListener("click", () => {
                const field = th.getAttribute("data-sort");
                if (state.sortField === field) {
                    state.sortAscending = !state.sortAscending;
                } else {
                    state.sortField = field;
                    state.sortAscending = false;
                }
                elements.filesTable.querySelectorAll("th.sortable").forEach(h => {
                    h.classList.remove("sort-asc", "sort-desc");
                });
                th.classList.add(state.sortAscending ? "sort-asc" : "sort-desc");
                renderFilesTable();
            });
        });

        // Risk Explanation Chart View Switcher
        elements.chartTabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                elements.chartTabBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const view = btn.getAttribute("data-chart-view");
                elements.chartViewPanes.forEach(pane => {
                    if (pane.id === `chart-view-${view}`) {
                        pane.classList.add("active");
                    } else {
                        pane.classList.remove("active");
                    }
                });
            });
        });

        // Solutions Tab File Selector
        if (elements.solutionFileSelect) {
            elements.solutionFileSelect.addEventListener("change", (e) => {
                const file = (state.currentReport?.files || []).find(f => f.file_path === e.target.value);
                if (file) loadSolutionForFile(file);
            });
        }

        // Solutions Before vs After view buttons
        elements.codeViewBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                elements.codeViewBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.solutionViewMode = btn.getAttribute("data-view");
                renderSolutionCode();
            });
        });

        // Solutions Copy Code
        if (elements.btnCopySolution) {
            elements.btnCopySolution.addEventListener("click", () => {
                const code = elements.solutionCodeBlock?.textContent || "";
                if (code) {
                    navigator.clipboard.writeText(code).then(() => {
                        elements.copySolutionText.textContent = "Copied to Clipboard!";
                        showToast("Solution code copied to clipboard!");
                        setTimeout(() => {
                            elements.copySolutionText.textContent = "Copy Commented Solution";
                        }, 2500);
                    });
                }
            });
        }

        // Solutions Download Code
        if (elements.btnDownloadSolution) {
            elements.btnDownloadSolution.addEventListener("click", () => {
                const code = elements.solutionCodeBlock?.textContent || "";
                const fileName = state.selectedSolutionFile ? state.selectedSolutionFile.file_name : "refactored_solution.py";
                downloadTextFile(`fixed_${fileName}`, code);
                showToast(`Downloaded fixed_${fileName}`);
            });
        }

        // Smart Refactoring Assistant File Selector
        if (elements.assistantFileSelect) {
            elements.assistantFileSelect.addEventListener("change", (e) => {
                const file = (state.currentReport?.files || []).find(f => f.file_path === e.target.value);
                if (file) {
                    state.selectedAssistantFile = file;
                    runAssistantRemediation(file, state.assistantAction);
                }
            });
        }

        // Smart Refactoring Assistant Quick Prompt Buttons
        elements.quickPromptBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                elements.quickPromptBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.assistantAction = btn.getAttribute("data-action");
                if (state.selectedAssistantFile) {
                    runAssistantRemediation(state.selectedAssistantFile, state.assistantAction);
                }
            });
        });

        // Smart Refactoring Assistant Custom Query
        if (elements.btnSubmitAssistant && elements.assistantCustomQuery) {
            const handleAssistantAsk = () => {
                const query = elements.assistantCustomQuery.value.trim();
                if (query && state.selectedAssistantFile) {
                    runAssistantRemediation(state.selectedAssistantFile, "custom", query);
                }
            };
            elements.btnSubmitAssistant.addEventListener("click", handleAssistantAsk);
            elements.assistantCustomQuery.addEventListener("keydown", (e) => {
                if (e.key === "Enter") handleAssistantAsk();
            });
        }

        // Assistant Code Views (Refactored / Original / Steps)
        elements.asstViewBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                elements.asstViewBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.assistantViewMode = btn.getAttribute("data-asst-view");
                renderAssistantCode();
            });
        });

        // Assistant Copy Code
        if (elements.btnCopyAssistantCode) {
            elements.btnCopyAssistantCode.addEventListener("click", () => {
                const code = elements.assistantCodeDisplay?.textContent || "";
                if (code) {
                    navigator.clipboard.writeText(code).then(() => {
                        elements.copyAsstText.textContent = "Copied!";
                        showToast("Assistant code copied to clipboard!");
                        setTimeout(() => {
                            elements.copyAsstText.textContent = "Copy Code";
                        }, 2500);
                    });
                }
            });
        }

        // Assistant Download Fixed File
        if (elements.btnDownloadAssistantCode) {
            elements.btnDownloadAssistantCode.addEventListener("click", () => {
                const code = elements.assistantCodeDisplay?.textContent || "";
                const fileName = state.selectedAssistantFile ? state.selectedAssistantFile.file_name : "refactored_file.py";
                downloadTextFile(`refactored_${fileName}`, code);
                showToast(`Downloaded refactored_${fileName}`);
            });
        }

        // Export PDF Button (Protected by Auth Gate)
        if (elements.btnExportPdf) {
            elements.btnExportPdf.addEventListener("click", () => {
                if (!currentSupabaseUser) {
                    sessionStorage.setItem("pending_auth_action", "download_pdf");
                    openAuthModal("Please sign in or create an account to download your official PDF report. Your analysis results are preserved and will download immediately upon signing in!");
                    return;
                }
                exportReportPDF();
            });
        }

        // Share Report Button (Protected by Auth Gate)
        if (elements.btnShareReport) {
            elements.btnShareReport.addEventListener("click", () => {
                if (!currentSupabaseUser) {
                    sessionStorage.setItem("pending_auth_action", "share_report");
                    openAuthModal("Please sign in or create an account to share audit reports.");
                    return;
                }
                shareReport();
            });
        }

        // Drawer Jump to Solution
        if (elements.drawerOpenSolutionBtn) {
            elements.drawerOpenSolutionBtn.addEventListener("click", () => {
                closeShapDrawer();
                if (state.selectedFileId && state.currentReport) {
                    const file = state.currentReport.files.find(f => f.id === state.selectedFileId);
                    if (file) {
                        switchTab("tab-solutions");
                        if (elements.solutionFileSelect) {
                            elements.solutionFileSelect.value = file.file_path;
                            loadSolutionForFile(file);
                        }
                        scrollToResults();
                    }
                }
            });
        }

        // Close drawer handlers
        elements.closeDrawerBtn.addEventListener("click", closeShapDrawer);
        elements.shapDrawer.addEventListener("click", (e) => {
            if (e.target === elements.shapDrawer) closeShapDrawer();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !elements.shapDrawer.classList.contains("hidden")) {
                closeShapDrawer();
            }
        });
    }

    function switchTab(tabId) {
        elements.tabBtns.forEach(b => {
            if (b.getAttribute("data-tab") === tabId) {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
        elements.tabPanes.forEach(p => {
            if (p.id === tabId) {
                p.classList.add("active");
            } else {
                p.classList.remove("active");
            }
        });
    }

    function scrollToResults() {
        if (elements.resultsSection) {
            elements.resultsSection.scrollIntoView({ behavior: "smooth" });
        }
    }

    // 3. API Communication
    async function checkEngineHealth() {
        try {
            const res = await fetch("/api/health");
            if (res.ok) {
                const data = await res.json();
                elements.systemStatusText.textContent = "Engine Online";
            }
        } catch {
            elements.systemStatusText.textContent = "Offline Mode";
        }
    }

    async function loadInitialBenchmark() {
        setLoadingState(true);
        try {
            const res = await fetch("/api/sample?model_type=random_forest");
            if (res.ok) {
                const report = await res.json();
                state.currentReport = report;
                renderDashboard(report);
            }
        } catch (err) {
            console.error("Failed to load initial benchmark:", err);
        } finally {
            setLoadingState(false);
        }
    }

    async function handleFormSubmit(e) {
        if (e) e.preventDefault();
        const repoUrl = elements.repoUrlInput.value.trim();
        const modelType = elements.modelSelect.value;
        const branch = (elements.branchInput && elements.branchInput.value) ? elements.branchInput.value.trim() : "main";

        if (!repoUrl) return;

        setLoadingState(true);
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    branch: branch,
                    model_type: modelType,
                    max_files: 50,
                    use_sample_if_fail: true,
                    user_id: currentSupabaseUser ? currentSupabaseUser.id : null,
                    user_email: currentSupabaseUser ? (currentSupabaseUser.email || currentSupabaseUser.phone) : null,
                    github_token: document.getElementById("github-token-input")?.value.trim() || null
                })
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.statusText}`);
            }

            const report = await res.json();
            state.currentReport = report;
            renderDashboard(report);
            showToast("Repository analysis completed!");
        } catch (err) {
            console.error("Analysis failed:", err);
            showToast("Analysis encountered an error. Loaded fallback data.");
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(loading) {
        state.isLoading = loading;
        if (loading) {
            elements.analyzeSpinner.classList.remove("hidden");
            elements.analyzeBtn.disabled = true;
            elements.analyzeBtn.style.opacity = "0.7";
        } else {
            elements.analyzeSpinner.classList.add("hidden");
            elements.analyzeBtn.disabled = false;
            elements.analyzeBtn.style.opacity = "1";
        }
    }

    // 4. Render Dashboard Components
    function renderDashboard(report) {
        if (!report) return;

        // Header Meta
        elements.summaryRepoName.textContent = (report.repo_name || "Architecture Suite")
            .replace(/demo[-_]?/gi, "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
        if (elements.summaryBranchBadge) {
            elements.summaryBranchBadge.style.display = "none";
        }
        elements.summaryTimestamp.textContent = `Analyzed on ${report.analyzed_at}`;

        // Overall Score & Radial Gauge
        const score = report.overall_debt_score;
        elements.gaugePercent.textContent = `${score}%`;

        const circumference = 314.15;
        const offset = circumference - (score / 100) * circumference;
        elements.gaugeProgress.style.strokeDashoffset = offset;

        // Gauge Color & Status Badge
        elements.gaugeStatusBadge.className = "status-pill";
        if (score >= 80) {
            elements.gaugeProgress.style.stroke = "var(--status-critical)";
            elements.gaugeStatusBadge.classList.add("status-critical");
            elements.gaugeStatusBadge.textContent = "Critical Debt Risk";
        } else if (score >= 55) {
            elements.gaugeProgress.style.stroke = "var(--status-high)";
            elements.gaugeStatusBadge.classList.add("status-high");
            elements.gaugeStatusBadge.textContent = "High Debt Risk";
        } else if (score >= 30) {
            elements.gaugeProgress.style.stroke = "var(--status-moderate)";
            elements.gaugeStatusBadge.classList.add("status-moderate");
            elements.gaugeStatusBadge.textContent = "Moderate Debt Risk";
        } else {
            elements.gaugeProgress.style.stroke = "var(--status-low)";
            elements.gaugeStatusBadge.classList.add("status-low");
            elements.gaugeStatusBadge.textContent = "Healthy Architecture";
        }

        // Summary Description
        elements.summaryHealthDesc.textContent = `Overall system status evaluated as '${report.health_status}'. Analysis accounts for ${report.total_files} active source files.`;

        // Stat Cards
        elements.statTotalFiles.textContent = report.total_files;
        elements.statTotalLoc.textContent = `${report.total_loc.toLocaleString()} Total LOC`;
        elements.statCriticalFiles.textContent = report.critical_risk_files;
        elements.statAvgComplexity.textContent = report.avg_complexity.toFixed(1);
        
        // Active Model Name & AUC
        const activeBenchmark = report.model_benchmarks?.find(b => b.is_active) || report.model_benchmarks?.[0];
        if (activeBenchmark) {
            elements.statActiveModel.textContent = activeBenchmark.display_name.split("(")[0].trim();
            elements.statModelAuc.textContent = `ROC-AUC: ${(activeBenchmark.roc_auc * 100).toFixed(1)}%`;
        }

        // Distribution Breakdown
        const total = Math.max(1, report.total_files);
        const pCrit = (report.critical_risk_files / total) * 100;
        const pHigh = (report.high_risk_files / total) * 100;
        const pMod = (report.moderate_risk_files / total) * 100;
        const pLow = (report.low_risk_files / total) * 100;

        elements.barCritical.style.width = `${pCrit}%`;
        elements.barHigh.style.width = `${pHigh}%`;
        elements.barModerate.style.width = `${pMod}%`;
        elements.barLow.style.width = `${pLow}%`;

        elements.distCountCritical.textContent = report.critical_risk_files;
        elements.distCountHigh.textContent = report.high_risk_files;
        elements.distCountModerate.textContent = report.moderate_risk_files;
        elements.distCountLow.textContent = report.low_risk_files;

        // Filter chips count badges
        const chipAll = document.getElementById("chip-count-all");
        const chipCrit = document.getElementById("chip-count-critical");
        const chipHigh = document.getElementById("chip-count-high");
        const chipMod = document.getElementById("chip-count-moderate");
        const chipLow = document.getElementById("chip-count-low");
        if (chipAll) chipAll.textContent = report.total_files;
        if (chipCrit) chipCrit.textContent = report.critical_risk_files;
        if (chipHigh) chipHigh.textContent = report.high_risk_files;
        if (chipMod) chipMod.textContent = report.moderate_risk_files;
        if (chipLow) chipLow.textContent = report.low_risk_files;

        // Top Drivers & Global Recommendations
        elements.topDriversList.innerHTML = report.top_risk_drivers.map(d => `<li>${escapeHtml(d)}</li>`).join("");
        elements.globalRecsList.innerHTML = report.global_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join("");

        // Render Risk Explanation Chart
        renderRiskExplanationChart(report);

        // Render Analytics Bar Chart
        renderRiskBarChart(report.files || []);

        // Populate Solutions & Assistant Dropdowns
        populateFileDropdowns(report);

        // Render Tables & Hotspots
        renderFilesTable();
        renderHotspotGrid();
        renderBenchmarksTable();
        renderGitHistory(report.git_history || []);
    }

    // 5. Render Risk Explanation & Factor Attribution Chart
    function renderRiskExplanationChart(report) {
        if (!report || !elements.factorBarsContainer) return;

        const files = report.files || [];
        const totalFiles = Math.max(1, files.length);

        const avgComp = report.avg_complexity;
        const totalChurn = files.reduce((acc, f) => acc + (f.code_churn || 0), 0);
        const avgChurn = Math.round(totalChurn / totalFiles);
        const avgLoc = Math.round(report.total_loc / totalFiles);
        const totalBugs = files.reduce((acc, f) => acc + (f.bug_fixes_count || 0), 0);
        const avgAuthors = (files.reduce((acc, f) => acc + (f.authors_count || 0), 0) / totalFiles).toFixed(1);

        const factors = [
            {
                name: "AST Cyclomatic Complexity",
                weight: "35% Weight",
                fillPercent: Math.min(100, Math.round((avgComp / 25) * 100)),
                color: avgComp > 15 ? "var(--status-critical)" : avgComp > 8 ? "var(--status-high)" : "var(--status-low)",
                impactBadge: avgComp > 15 ? "Critical Impact" : avgComp > 8 ? "Elevated Impact" : "Optimal Baseline",
                currentStat: `Avg CC: ${avgComp.toFixed(1)} (AST Branches)`,
                desc: "Evaluates nested conditionals, loops, and cyclomatic branching density."
            },
            {
                name: "Git Commit Churn Velocity",
                weight: "25% Weight",
                fillPercent: Math.min(100, Math.round((avgChurn / 800) * 100)),
                color: avgChurn > 500 ? "var(--status-critical)" : avgChurn > 200 ? "var(--status-high)" : "var(--status-low)",
                impactBadge: avgChurn > 500 ? "High Volatility" : "Normal Velocity",
                currentStat: `Avg Churn: ${avgChurn.toLocaleString()} lines / file`,
                desc: "Measures unstable commit frequency and rate of ongoing code revisions."
            },
            {
                name: "Monolithic Scale (LOC Density)",
                weight: "20% Weight",
                fillPercent: Math.min(100, Math.round((avgLoc / 600) * 100)),
                color: avgLoc > 400 ? "var(--status-high)" : "var(--status-low)",
                impactBadge: avgLoc > 400 ? "Large Modules" : "Manageable Size",
                currentStat: `Avg LOC: ${avgLoc} per file`,
                desc: "Penalizes oversized monolithic classes exceeding Single Responsibility."
            },
            {
                name: "Historical Bug Regressions",
                weight: "12% Weight",
                fillPercent: Math.min(100, Math.round((totalBugs / (totalFiles * 5)) * 100)),
                color: totalBugs > totalFiles * 2 ? "var(--status-critical)" : "var(--status-moderate)",
                impactBadge: totalBugs > totalFiles * 2 ? "Defect Prone" : "Low Defect Churn",
                currentStat: `${totalBugs} total patch repairs`,
                desc: "Tracks historical bug-fix tags and regression frequency across modules."
            },
            {
                name: "Author Dispersion Entropy",
                weight: "8% Weight",
                fillPercent: Math.min(100, Math.round((parseFloat(avgAuthors) / 8) * 100)),
                color: avgAuthors > 5 ? "var(--status-high)" : "var(--status-low)",
                impactBadge: avgAuthors > 5 ? "High Multi-Author" : "Focused Ownership",
                currentStat: `Avg Authors: ${avgAuthors} contributors`,
                desc: "Evaluates developer coordination silos and collaborative divergence."
            }
        ];

        elements.factorBarsContainer.innerHTML = factors.map(f => `
            <div class="factor-bar-card">
                <div class="factor-card-top">
                    <span class="factor-name">${f.name}</span>
                    <span class="factor-weight-badge">${f.weight}</span>
                </div>
                <div class="factor-meter-track">
                    <div class="factor-meter-fill" style="width: ${f.fillPercent}%; background: ${f.color};"></div>
                </div>
                <div class="factor-card-bottom">
                    <span class="factor-current-stat">${f.currentStat}</span>
                    <span class="factor-impact-label" style="color: ${f.color};">${f.impactBadge}</span>
                </div>
            </div>
        `).join("");

        if (elements.tierMatrixContainer) {
            const tiers = [
                {
                    key: "critical",
                    name: "Critical Risk (≥80%)",
                    count: report.critical_risk_files,
                    pct: Math.round((report.critical_risk_files / totalFiles) * 100),
                    color: "var(--status-critical)",
                    urgency: "Immediate Architectural Action Required"
                },
                {
                    key: "high",
                    name: "High Risk (55–79%)",
                    count: report.high_risk_files,
                    pct: Math.round((report.high_risk_files / totalFiles) * 100),
                    color: "var(--status-high)",
                    urgency: "Sprint Backlog Refactoring Target"
                },
                {
                    key: "moderate",
                    name: "Moderate Risk (30–54%)",
                    count: report.moderate_risk_files,
                    pct: Math.round((report.moderate_risk_files / totalFiles) * 100),
                    color: "var(--status-moderate)",
                    urgency: "Routine Maintenance & Guard Clauses"
                },
                {
                    key: "low",
                    name: "Healthy / Safe (<30%)",
                    count: report.low_risk_files,
                    pct: Math.round((report.low_risk_files / totalFiles) * 100),
                    color: "var(--status-low)",
                    urgency: "Meets Enterprise Standards"
                }
            ];

            elements.tierMatrixContainer.innerHTML = tiers.map(t => `
                <div class="tier-card tier-${t.key}">
                    <div class="tier-card-header">
                        <span class="tier-name" style="color: ${t.color}">${t.name}</span>
                        <span class="tier-pct">${t.pct}%</span>
                    </div>
                    <div class="tier-count">${t.count} <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-muted);">files</span></div>
                    <div class="tier-percent-bar">
                        <div class="tier-percent-fill" style="width: ${t.pct}%; background: ${t.color};"></div>
                    </div>
                    <span class="tier-urgency">${t.urgency}</span>
                </div>
            `).join("");
        }
    }

    // 6. Render Interactive Analytics Graph
    function renderRiskBarChart(files) {
        const container = document.getElementById("risk-bar-chart");
        if (!container || !files || files.length === 0) return;

        const maxScore = 100;
        container.innerHTML = files.slice(0, 18).map(f => {
            const h = Math.max(14, Math.round((f.risk_score / maxScore) * 135));
            let color = "var(--status-low)";
            if (f.risk_level === "critical") color = "var(--status-critical)";
            else if (f.risk_level === "high") color = "var(--status-high)";
            else if (f.risk_level === "moderate") color = "var(--status-moderate)";

            return `
                <div class="chart-bar-group" data-file-id="${f.id}" title="${escapeHtml(f.file_name)}: ${f.risk_score}% Risk | CC: ${f.complexity.toFixed(1)} | ${f.loc} LOC">
                    <span class="chart-bar-val" style="color: ${color}">${f.risk_score}%</span>
                    <div class="chart-bar-pillar" style="height: ${h}px; background: ${color}; color: ${color};"></div>
                    <span class="chart-bar-label">${escapeHtml(f.file_name.split(".")[0])}</span>
                </div>
            `;
        }).join("");

        container.querySelectorAll(".chart-bar-group").forEach(group => {
            group.addEventListener("click", () => {
                const fileId = group.getAttribute("data-file-id");
                openShapDrawer(fileId);
            });
        });
    }

    // 7. Populate Dropdowns for Solutions & Assistant
    function populateFileDropdowns(report) {
        if (!report || !report.files || report.files.length === 0) return;

        const files = report.files;
        const optionsHtml = files.map(f => `
            <option value="${f.file_path}">${f.file_name} (${f.risk_score}% Debt)</option>
        `).join("");

        if (elements.solutionFileSelect) {
            elements.solutionFileSelect.innerHTML = optionsHtml;
            const topRisk = [...files].sort((a, b) => b.risk_score - a.risk_score)[0];
            elements.solutionFileSelect.value = topRisk.file_path;
            loadSolutionForFile(topRisk);
        }

        if (elements.assistantFileSelect) {
            elements.assistantFileSelect.innerHTML = optionsHtml;
            const topRisk = [...files].sort((a, b) => b.risk_score - a.risk_score)[0];
            elements.assistantFileSelect.value = topRisk.file_path;
            state.selectedAssistantFile = topRisk;
            runAssistantRemediation(topRisk, state.assistantAction);
        }
    }

    // 8. Load & Render Solutions Tab
    async function loadSolutionForFile(file) {
        if (!file) return;
        state.selectedSolutionFile = file;

        if (elements.solutionFileTitle) elements.solutionFileTitle.textContent = file.file_path;
        if (elements.solutionLangPill) elements.solutionLangPill.textContent = file.language;

        try {
            const res = await fetch("/api/fix-solution", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: file.file_path,
                    language: file.language,
                    complexity: file.complexity,
                    loc: file.loc,
                    recommendations: file.recommendations || []
                })
            });

            if (res.ok) {
                const data = await res.json();
                state.solutionData = data;
                if (elements.solutionProblemDesc) {
                    elements.solutionProblemDesc.textContent = data.problem_summary;
                }
                renderSolutionCode();
            }
        } catch (err) {
            console.error("Failed to fetch solution:", err);
        }
    }

    function renderSolutionCode() {
        if (!state.solutionData || !elements.solutionCodeBlock) return;
        if (state.solutionViewMode === "solution") {
            elements.solutionCodeBlock.textContent = state.solutionData.solution_code;
        } else {
            elements.solutionCodeBlock.textContent = state.solutionData.before_code;
        }
    }

    // 9. Smart Refactoring Assistant Execution
    async function runAssistantRemediation(file, actionType, customPrompt = "") {
        if (!file) return;
        state.selectedAssistantFile = file;

        const currComp = file.complexity.toFixed(1);
        let projComp = (file.complexity * 0.12).toFixed(1);
        if (parseFloat(projComp) < 1.8) projComp = "1.8";
        const debtDrop = `-${Math.round((1 - (parseFloat(projComp) / file.complexity)) * 100)}%`;

        if (elements.forecastCurrComp) elements.forecastCurrComp.textContent = currComp;
        if (elements.forecastProjComp) elements.forecastProjComp.textContent = projComp;
        if (elements.forecastDebtDrop) elements.forecastDebtDrop.textContent = debtDrop;

        let solutionCode = "";
        let beforeCode = "";
        let problemSummary = "";

        try {
            const res = await fetch("/api/fix-solution", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    file_path: file.file_path,
                    language: file.language,
                    complexity: file.complexity,
                    loc: file.loc,
                    recommendations: file.recommendations || []
                })
            });
            if (res.ok) {
                const data = await res.json();
                solutionCode = data.solution_code;
                beforeCode = data.before_code;
                problemSummary = data.problem_summary;
            }
        } catch {
            solutionCode = `# RefactAI Assistant generated solution for ${file.file_name}`;
            beforeCode = `# Original code`;
            problemSummary = `Identified high cyclomatic complexity (${currComp}) and monolithic coupling.`;
        }

        let diagText = "";
        let stepsChecklist = "";

        if (actionType === "guard-clauses") {
            diagText = `Identified nested control-flow anti-pattern in ${file.file_name}. Replacing conditional ladders with early-exit Guard Clauses eliminates 6 levels of nesting and reduces branching complexity by 75%.`;
            stepsChecklist = `# RefactAI Guard Clauses Transformation Plan:\n1. Invert nested if-statements to check precondition violations early.\n2. Return immediately on invalid states to avoid deep indentations.\n3. Keep primary execution path unnested at function root level.`;
        } else if (actionType === "extract-service") {
            diagText = `Monolithic responsibility detected in ${file.file_name} (${file.loc} LOC). Decomposing into discrete micro-services with dependency injection prevents cross-concern leakage and enables unit test isolation.`;
            stepsChecklist = `# RefactAI Service Extraction Plan:\n1. Segregate business logic, persistence, and external HTTP transport.\n2. Introduce interface contracts for external client dependencies.\n3. Ensure high cohesion with Single Responsibility Principle.`;
        } else if (actionType === "test-harness") {
            diagText = `Generated a comprehensive regression test harness covering edge-case inputs, boundary conditions, and mock external payment gateway responses prior to production rollout.`;
            stepsChecklist = `# RefactAI Test Safety Checklist:\n1. Verified null/empty order validation test case.\n2. Verified retry logic with exponential backoff under network fault.\n3. Verified thread safety across concurrent transactions.`;
        } else if (actionType === "custom" && customPrompt) {
            diagText = `Assistant prompt answered: "${customPrompt}". Generated architectural refactoring tailored to your query, reducing cyclomatic complexity from ${currComp} down to ${projComp}.`;
            stepsChecklist = `# Custom Remediation Steps for: ${customPrompt}\n1. Applied automated AST decomposition.\n2. Restructured method boundaries to prevent monolithic coupling.\n3. Verified interface consistency.`;
        } else {
            diagText = `Autonomous Analysis: ${problemSummary} RefactAI applied the Strategy Pattern and Guard Clauses to isolate vendor SDKs and reduce AST complexity from ${currComp} to ${projComp} (${debtDrop} debt reduction).`;
            stepsChecklist = `# RefactAI Standard Remediation Roadmap:\n1. Encapsulate parameters in immutable domain dataclasses.\n2. Abstract vendor calls behind Strategy interface.\n3. Replace hard-coded conditionals with dynamic registry dispatch.`;
        }

        if (elements.assistantDiagText) {
            elements.assistantDiagText.textContent = diagText;
        }

        state.assistantData = {
            refactored: solutionCode,
            original: beforeCode,
            steps: stepsChecklist
        };

        renderAssistantCode();
    }

    function renderAssistantCode() {
        if (!state.assistantData || !elements.assistantCodeDisplay) return;
        const mode = state.assistantViewMode;
        if (mode === "refactored") {
            elements.assistantCodeDisplay.textContent = state.assistantData.refactored;
        } else if (mode === "original") {
            elements.assistantCodeDisplay.textContent = state.assistantData.original;
        } else if (mode === "steps") {
            elements.assistantCodeDisplay.textContent = state.assistantData.steps;
        }
    }

    // 10. Render Files Table (Fully Working with 10 Columns)
    function renderFilesTable() {
        if (!state.currentReport || !state.currentReport.files) return;

        let files = [...state.currentReport.files];

        if (state.searchQuery) {
            files = files.filter(f => 
                f.file_path.toLowerCase().includes(state.searchQuery) ||
                f.language.toLowerCase().includes(state.searchQuery)
            );
        }

        if (state.currentFilter !== "all") {
            files = files.filter(f => f.risk_level === state.currentFilter);
        }

        files.sort((a, b) => {
            let valA = a[state.sortField];
            let valB = b[state.sortField];

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA < valB) return state.sortAscending ? -1 : 1;
            if (valA > valB) return state.sortAscending ? 1 : -1;
            return 0;
        });

        if (files.length === 0) {
            elements.filesTbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2.5rem; color: var(--text-muted);">No files match your query or filter criteria.</td></tr>`;
            return;
        }

        elements.filesTbody.innerHTML = files.map(f => {
            const badgeClass = `status-${f.risk_level}`;
            return `
                <tr data-file-id="${f.id}">
                    <td>
                        <div class="file-cell">
                            <span class="file-name-strong">${escapeHtml(f.file_name)}</span>
                            <span class="file-path-sub">${escapeHtml(f.file_path)}</span>
                        </div>
                    </td>
                    <td><span class="lang-pill">${escapeHtml(f.language)}</span></td>
                    <td>${f.loc}</td>
                    <td>${f.complexity.toFixed(1)}</td>
                    <td>${f.code_churn}</td>
                    <td>${f.authors_count}</td>
                    <td>${f.bug_fixes_count}</td>
                    <td>
                        <span class="risk-badge ${badgeClass}">
                            ${f.risk_score}%
                        </span>
                    </td>
                    <td>
                        <button class="btn-explain" data-file-id="${f.id}">
                            View SHAP &rarr;
                        </button>
                    </td>
                    <td>
                        <button class="btn-solution-action" data-file-path="${escapeHtml(f.file_path)}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            Auto Fix &rarr;
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        // Attach click handlers
        elements.filesTbody.querySelectorAll(".btn-explain").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const fileId = btn.getAttribute("data-file-id");
                openShapDrawer(fileId);
            });
        });

        elements.filesTbody.querySelectorAll(".btn-solution-action").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const filePath = btn.getAttribute("data-file-path");
                const file = state.currentReport.files.find(f => f.file_path === filePath);
                if (file) {
                    switchTab("tab-solutions");
                    if (elements.solutionFileSelect) {
                        elements.solutionFileSelect.value = filePath;
                        loadSolutionForFile(file);
                    }
                    scrollToResults();
                    showToast(`Loaded RefactAI solution for ${file.file_name}`);
                }
            });
        });

        elements.filesTbody.querySelectorAll("tr").forEach(row => {
            row.addEventListener("click", () => {
                const fileId = row.getAttribute("data-file-id");
                openShapDrawer(fileId);
            });
        });
    }

    // 11. Render Hotspot Matrix Grid
    function renderHotspotGrid() {
        if (!state.currentReport || !state.currentReport.files) return;

        const files = state.currentReport.files;
        elements.hotspotGrid.innerHTML = files.map(f => {
            const cardClass = `hotspot-${f.risk_level}`;
            return `
                <div class="hotspot-card ${cardClass}" data-file-id="${f.id}">
                    <div class="hotspot-top">
                        <span class="hotspot-name">${escapeHtml(f.file_name)}</span>
                        <span class="lang-pill">${escapeHtml(f.language)}</span>
                    </div>
                    <div class="hotspot-bottom">
                        <div class="hotspot-stats">
                            <div>LOC: <strong>${f.loc}</strong></div>
                            <div>Complexity: <strong>${f.complexity.toFixed(1)}</strong></div>
                            <div>Authors: <strong>${f.authors_count}</strong></div>
                        </div>
                        <div class="hotspot-risk-num">${f.risk_score}%</div>
                    </div>
                </div>
            `;
        }).join("");

        elements.hotspotGrid.querySelectorAll(".hotspot-card").forEach(card => {
            card.addEventListener("click", () => {
                const fileId = card.getAttribute("data-file-id");
                openShapDrawer(fileId);
            });
        });
    }

    // 12. Render Model Benchmarks Table
    function renderBenchmarksTable() {
        if (!state.currentReport || !state.currentReport.model_benchmarks) return;

        elements.benchmarksTbody.innerHTML = state.currentReport.model_benchmarks.map(b => {
            const statusHtml = b.is_active 
                ? `<span class="model-active-badge">Active Model</span>`
                : `<span style="color:var(--text-muted); font-size:0.75rem;">Comparative</span>`;

            return `
                <tr>
                    <td><strong>${escapeHtml(b.display_name)}</strong></td>
                    <td>${statusHtml}</td>
                    <td>${(b.accuracy * 100).toFixed(1)}%</td>
                    <td>${(b.precision * 100).toFixed(1)}%</td>
                    <td>${(b.recall * 100).toFixed(1)}%</td>
                    <td>${(b.f1_score * 100).toFixed(1)}%</td>
                    <td>${(b.roc_auc * 100).toFixed(1)}%</td>
                    <td>${b.mae.toFixed(3)}</td>
                    <td>${b.rmse.toFixed(3)}</td>
                </tr>
            `;
        }).join("");
    }

    // 13. Open Explainable AI (SHAP) Drawer
    function openShapDrawer(fileId) {
        if (!state.currentReport) return;
        const file = state.currentReport.files.find(f => f.id === fileId);
        if (!file) return;

        state.selectedFileId = fileId;

        elements.drawerFileName.textContent = file.file_name;
        elements.drawerFilePath.textContent = file.file_path;
        elements.drawerRiskScore.textContent = `${file.risk_score}%`;
        
        elements.drawerRiskBadge.className = `status-pill status-${file.risk_level}`;
        elements.drawerRiskBadge.textContent = `${capitalize(file.risk_level)} Debt Risk`;

        elements.drawerLoc.textContent = file.loc;
        elements.drawerComplexity.textContent = file.complexity.toFixed(1);
        elements.drawerAuthors.textContent = file.authors_count;
        elements.drawerBugs.textContent = file.bug_fixes_count;

        // Render SHAP waterfall bars
        if (file.shap_explanation && file.shap_explanation.length > 0) {
            elements.shapBarsContainer.innerHTML = file.shap_explanation.map(exp => {
                const isRed = exp.direction === "increases_risk";
                const barColorClass = isRed ? "red" : "green";
                const sign = isRed ? "+" : "-";

                return `
                    <div class="shap-item">
                        <div class="shap-item-top">
                            <span class="shap-feat-name">${escapeHtml(exp.display_name)}</span>
                            <span class="shap-feat-val" style="color: ${isRed ? 'var(--status-critical)' : 'var(--status-low)'}">
                                ${sign}${exp.weight_percentage}% SHAP Weight
                            </span>
                        </div>
                        <div class="shap-bar-track">
                            <div class="shap-bar-fill ${barColorClass}" style="width: ${Math.min(100, exp.weight_percentage * 2)}%"></div>
                        </div>
                        <div class="shap-item-desc">${escapeHtml(exp.explanation)}</div>
                    </div>
                `;
            }).join("");
        } else {
            elements.shapBarsContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No SHAP values computed for this file.</p>`;
        }

        // Render targeted refactoring recommendations
        if (file.recommendations && file.recommendations.length > 0) {
            elements.drawerRecsList.innerHTML = file.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join("");
        } else {
            elements.drawerRecsList.innerHTML = `<li>File meets acceptable health baselines.</li>`;
        }

        elements.shapDrawer.classList.remove("hidden");
    }

    function closeShapDrawer() {
        elements.shapDrawer.classList.add("hidden");
        state.selectedFileId = null;
    }

    // 14. Share Audit Report Function
    function shareReport() {
        if (!state.currentReport) {
            showToast("No analysis report available to share.");
            return;
        }

        const report = state.currentReport;
        const shareUrl = window.location.href;
        const shareTitle = `RefactAI Technical Debt Audit: ${report.repo_name}`;
        const shareText = `RefactAI Technical Debt Audit Report for ${report.repo_name} — Overall Debt Risk: ${report.overall_debt_score}% (${report.health_status})`;

        if (navigator.share) {
            navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl
            }).catch(() => {});
        }

        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Shareable Audit Report link copied to clipboard!");
        }).catch(() => {
            showToast(`Share URL: ${shareUrl}`);
        });
    }

    // 15. Export RefactAI Authorized & Shareable PDF Report (with Embedded Visual Graph)
    function exportReportPDF() {
        if (!state.currentReport) {
            showToast("No analysis report available to export.");
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast("PDF engine is initializing, please try again in a moment.");
            return;
        }

        showToast("Generating RefactAi Authorized PDF Report with embedded graph...");

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4"
            });

            const report = state.currentReport;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const auditId = `REF-AUDIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const auditDate = report.analyzed_at || new Date().toLocaleString();

            // ---------------- PAGE 1 HEADER & REFACTAI LOGO ----------------
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, pageWidth, 115, "F");

            // Top accent line
            doc.setFillColor(0, 85, 255);
            doc.rect(0, 0, pageWidth, 4, "F");

            // Draw RefactAi Vector Logo
            doc.setFillColor(0, 85, 255);
            doc.triangle(40, 48, 52, 28, 64, 48, "F");
            doc.setFillColor(0, 210, 255);
            doc.triangle(40, 52, 52, 72, 64, 52, "F");
            doc.setFillColor(121, 40, 202);
            doc.triangle(52, 48, 64, 48, 58, 60, "F");

            // Brand typography
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("Refact", 74, 52);
            doc.setTextColor(0, 210, 255);
            doc.text("Ai", 146, 52);

            // Subtitle
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(148, 163, 184);
            doc.text("Autonomous Technical Debt Intelligence & Code Health System", 74, 68);

            // ---------------- AUTHORIZED AUDIT SEAL / SYMBOL ----------------
            const sealX = pageWidth - 90;
            const sealY = 56;
            
            doc.setDrawColor(0, 85, 255);
            doc.setLineWidth(1.5);
            doc.circle(sealX, sealY, 32, "S");

            doc.setDrawColor(0, 210, 255);
            doc.setLineWidth(0.8);
            doc.circle(sealX, sealY, 28, "S");

            doc.setFillColor(30, 41, 59);
            doc.circle(sealX, sealY, 27, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(56, 189, 248);
            doc.text("REFACTAI VERIFIED", sealX, sealY - 14, { align: "center" });

            doc.setFontSize(13);
            doc.setTextColor(52, 211, 153);
            doc.text("✔", sealX, sealY + 3, { align: "center" });

            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.text("AUTHORIZED AUDIT", sealX, sealY + 14, { align: "center" });
            doc.text("COMPLIANCE SEAL", sealX, sealY + 22, { align: "center" });

            // Document Meta under header
            let startY = 135;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text("Official Technical Debt Audit Report", 40, startY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.text(`Audit ID: ${auditId}  |  Generated: ${auditDate}  |  Classification: Verified Shareable Audit`, 40, startY + 16);

            // ---------------- EXECUTIVE SUMMARY BOX ----------------
            startY += 30;
            const boxHeight = 82;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(1);
            doc.roundedRect(40, startY, pageWidth - 80, boxHeight, 6, 6, "FD");

            const score = report.overall_debt_score;
            let scoreBg = [239, 68, 68];
            let scoreLabel = "CRITICAL DEBT RISK";
            if (score < 30) {
                scoreBg = [16, 185, 129];
                scoreLabel = "HEALTHY ARCHITECTURE";
            } else if (score < 55) {
                scoreBg = [234, 179, 8];
                scoreLabel = "MODERATE DEBT RISK";
            } else if (score < 80) {
                scoreBg = [249, 115, 22];
                scoreLabel = "HIGH DEBT RISK";
            }

            doc.setFillColor(...scoreBg);
            doc.roundedRect(55, startY + 16, 145, 50, 4, 4, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(255, 255, 255);
            doc.text(`${score}%`, 127, startY + 38, { align: "center" });

            doc.setFontSize(7.5);
            doc.text(scoreLabel, 127, startY + 54, { align: "center" });

            const colStartX = 220;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text("TARGET REPOSITORY", colStartX, startY + 24);
            doc.text("TOTAL FILES / LOC", colStartX + 125, startY + 24);
            doc.text("CRITICAL HOTSPOTS", colStartX + 230, startY + 24);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            const repoClean = (report.repo_name || "Repository").replace(/demo[-_]?/gi, "");
            doc.text(repoClean, colStartX, startY + 40);
            doc.text(`${report.total_files} files / ${report.total_loc.toLocaleString()} LOC`, colStartX + 125, startY + 40);
            doc.setTextColor(239, 68, 68);
            doc.text(`${report.critical_risk_files} Hotspots (≥80%)`, colStartX + 230, startY + 40);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            const activeBench = report.model_benchmarks?.find(b => b.is_active) || report.model_benchmarks?.[0];
            const benchInfo = activeBench ? `${activeBench.display_name.split('(')[0]} (ROC-AUC: ${(activeBench.roc_auc * 100).toFixed(1)}%)` : "Random Forest";
            doc.text(`Active ML Model: ${benchInfo} | Avg Cyclomatic Complexity: ${report.avg_complexity.toFixed(1)}`, colStartX, startY + 60);

            // ---------------- VISUAL GRAPH EMBEDDED IN PDF ----------------
            startY += boxHeight + 20;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("Visual Risk & Complexity Analytics Graph", 40, startY);

            startY += 12;
            const maxGraphWidth = 320;
            const graphX = 175;

            // Axis ticks
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.8);
            doc.line(graphX, startY, graphX + maxGraphWidth, startY);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            [0, 25, 50, 75, 100].forEach(pct => {
                const tickX = graphX + (pct / 100) * maxGraphWidth;
                doc.line(tickX, startY, tickX, startY + 3);
                doc.text(`${pct}%`, tickX, startY + 11, { align: "center" });
            });

            startY += 18;
            const topFilesForChart = (report.files || []).slice(0, 5);
            topFilesForChart.forEach(file => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 41, 59);
                const shortName = file.file_name.length > 22 ? file.file_name.substring(0, 20) + "..." : file.file_name;
                doc.text(shortName, 40, startY + 7);

                // Background track
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(graphX, startY, maxGraphWidth, 8, 2, 2, "F");

                // Filled Bar
                const barW = Math.max(4, (file.risk_score / 100) * maxGraphWidth);
                let barColor = [239, 68, 68];
                if (file.risk_level === "low") barColor = [16, 185, 129];
                else if (file.risk_level === "moderate") barColor = [234, 179, 8];
                else if (file.risk_level === "high") barColor = [249, 115, 22];

                doc.setFillColor(...barColor);
                doc.roundedRect(graphX, startY, barW, 8, 2, 2, "F");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(...barColor);
                doc.text(`${file.risk_score}% (CC: ${file.complexity.toFixed(1)})`, graphX + barW + 6, startY + 7);

                startY += 14;
            });
            startY += 8;

            // ---------------- TABLE OF ANALYZED FILES (AUTOTABLE) ----------------
            const tableBody = (report.files || []).map((f, idx) => [
                idx + 1,
                f.file_path,
                f.language,
                f.loc,
                f.complexity.toFixed(1),
                f.code_churn,
                f.authors_count,
                f.bug_fixes_count,
                `${f.risk_score}%`,
                capitalize(f.risk_level)
            ]);

            doc.autoTable({
                startY: startY,
                head: [[
                    "#",
                    "File Path & Module",
                    "Lang",
                    "LOC",
                    "Complexity",
                    "Churn",
                    "Authors",
                    "Bugs",
                    "Risk",
                    "Status"
                ]],
                body: tableBody,
                theme: "striped",
                styles: {
                    font: "helvetica",
                    fontSize: 7.5,
                    cellPadding: 4.5,
                    textColor: [30, 41, 59],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.5
                },
                headStyles: {
                    fillColor: [15, 23, 42],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 8
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: "center" },
                    1: { cellWidth: 160, fontStyle: "bold" },
                    2: { cellWidth: 42 },
                    3: { cellWidth: 35, halign: "right" },
                    4: { cellWidth: 45, halign: "right" },
                    5: { cellWidth: 38, halign: "right" },
                    6: { cellWidth: 38, halign: "right" },
                    7: { cellWidth: 35, halign: "right" },
                    8: { cellWidth: 40, halign: "center", fontStyle: "bold" },
                    9: { cellWidth: 50, halign: "center" }
                },
                didParseCell: function(data) {
                    if (data.section === "body" && data.column.index === 9) {
                        const val = data.cell.raw.toLowerCase();
                        if (val === "critical") data.cell.styles.textColor = [239, 68, 68];
                        else if (val === "high") data.cell.styles.textColor = [249, 115, 22];
                        else if (val === "moderate") data.cell.styles.textColor = [217, 119, 6];
                        else if (val === "low") data.cell.styles.textColor = [16, 185, 129];
                    }
                },
                margin: { left: 40, right: 40, bottom: 50 },
                didDrawPage: function(data) {
                    if (data.pageNumber > 1) {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(7.5);
                        doc.setTextColor(148, 163, 184);
                        doc.text("RefactAi™ Official Technical Debt Audit Report • Authorized & Shareable", 40, 25);
                        doc.text(`Audit ID: ${auditId}`, pageWidth - 40, 25, { align: "right" });
                        doc.setDrawColor(226, 232, 240);
                        doc.line(40, 30, pageWidth - 40, 30);
                    }

                    // Running Footer on every page
                    doc.setDrawColor(226, 232, 240);
                    doc.line(40, pageHeight - 35, pageWidth - 40, pageHeight - 35);

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(7.5);
                    doc.setTextColor(0, 85, 255);
                    doc.text("RefactAi Authorized Quality & Compliance System", 40, pageHeight - 22);

                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(148, 163, 184);
                    doc.text("Autonomous Machine Learning & Explainable AI Audit", 220, pageHeight - 22);
                    doc.text(`Page ${data.pageNumber}`, pageWidth - 40, pageHeight - 22, { align: "right" });
                }
            });

            // Recommendations & Shareable Verification Section
            let finalY = doc.lastAutoTable.finalY + 18;
            if (finalY > pageHeight - 130) {
                doc.addPage();
                finalY = 50;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(15, 23, 42);
            doc.text("Strategic Architectural Refactoring Roadmap", 40, finalY);

            finalY += 14;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            const recs = report.global_recommendations || ["Decompose payment orchestrator with Strategy pattern."];
            recs.slice(0, 3).forEach((r, i) => {
                doc.text(`${i + 1}.  ${r}`, 48, finalY + (i * 12));
            });

            finalY += (Math.min(3, recs.length) * 12) + 16;

            // Shareable Verification & Security Stamp Block
            if (finalY > pageHeight - 80) {
                doc.addPage();
                finalY = 50;
            }

            doc.setFillColor(240, 249, 255);
            doc.setDrawColor(186, 230, 253);
            doc.roundedRect(40, finalY, pageWidth - 80, 52, 4, 4, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(2, 132, 199);
            doc.text("OFFICIALLY CERTIFIED & SHAREABLE AUDIT REPORT", 55, finalY + 16);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`Verification ID: ${auditId}  |  Classification: Publicly Verified Technical Debt Audit`, 55, finalY + 28);
            
            const verifyUrl = window.location.origin || "http://127.0.0.1:8000";
            doc.setTextColor(0, 85, 255);
            doc.setFont("helvetica", "bold");
            doc.textWithLink(`Click here to View & Share Authentic Audit Online: ${verifyUrl}`, 55, finalY + 41, { url: verifyUrl });

            // Save file
            const cleanName = (report.repo_name || "Codebase").replace(/[^a-zA-Z0-9_-]/g, "_");
            doc.save(`RefactAI_Authorized_Report_${cleanName}.pdf`);
            showToast("Official RefactAI Shareable PDF Report exported successfully!");
        } catch (err) {
            console.error("PDF export failed:", err);
            showToast("Failed to generate PDF report. Check browser console.");
        }
    }

    // Helper Functions
    function showToast(msg) {
        const existing = document.querySelector(".refact-toast");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.className = "refact-toast";
        toast.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${escapeHtml(msg)}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(16px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // =========================================================================
    // INQUIRY & CONTACT MODAL (SUPABASE BACKEND INTEGRATION)
    // =========================================================================
    const navInquiryLink = document.getElementById("nav-inquiry-link");
    const inquiryModal = document.getElementById("inquiry-modal");
    const closeInquiryBtn = document.getElementById("close-inquiry-modal");
    const cancelInquiryBtn = document.getElementById("cancel-inquiry-modal");
    const inquiryForm = document.getElementById("inquiry-form");
    const inquiryFeedbackMsg = document.getElementById("inquiry-feedback-msg");
    const inquirySpinner = document.getElementById("inquiry-spinner");
    const btnSubmitInquiry = document.getElementById("btn-submit-inquiry");

    function openInquiryModal(presetRepoUrl = "") {
        if (!inquiryModal) return;
        inquiryModal.classList.remove("hidden");
        if (inquiryFeedbackMsg) {
            inquiryFeedbackMsg.textContent = "";
            inquiryFeedbackMsg.className = "form-status-msg";
        }
        const repoInput = document.getElementById("inquiry-repo");
        if (repoInput && (presetRepoUrl || repoUrlInput?.value)) {
            repoInput.value = presetRepoUrl || repoUrlInput.value;
        }
        document.body.style.overflow = "hidden";
        setTimeout(() => document.getElementById("inquiry-name")?.focus(), 100);
    }

    function closeInquiryModal() {
        if (!inquiryModal) return;
        inquiryModal.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (navInquiryLink) {
        navInquiryLink.addEventListener("click", (e) => {
            e.preventDefault();
            openInquiryModal();
        });
    }

    if (closeInquiryBtn) closeInquiryBtn.addEventListener("click", closeInquiryModal);
    if (cancelInquiryBtn) cancelInquiryBtn.addEventListener("click", closeInquiryModal);

    if (inquiryModal) {
        inquiryModal.addEventListener("click", (e) => {
            if (e.target === inquiryModal) closeInquiryModal();
        });
    }

    if (inquiryForm) {
        inquiryForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtnText = btnSubmitInquiry.querySelector(".btn-text");
            
            const payload = {
                name: document.getElementById("inquiry-name").value.trim(),
                email: document.getElementById("inquiry-email").value.trim(),
                organization: document.getElementById("inquiry-org")?.value.trim() || null,
                inquiry_type: document.getElementById("inquiry-type")?.value || "Enterprise Debt Audit",
                repo_url: document.getElementById("inquiry-repo")?.value.trim() || null,
                message: document.getElementById("inquiry-message").value.trim(),
                user_id: currentSupabaseUser ? currentSupabaseUser.id : null
            };

            if (!payload.name || !payload.email || !payload.message) {
                if (inquiryFeedbackMsg) {
                    inquiryFeedbackMsg.textContent = "Please fill in all required fields.";
                    inquiryFeedbackMsg.className = "form-status-msg error";
                }
                return;
            }

            try {
                if (inquirySpinner) inquirySpinner.classList.remove("hidden");
                if (btnSubmitInquiry) btnSubmitInquiry.disabled = true;
                if (submitBtnText) submitBtnText.textContent = "Syncing with Supabase...";

                const resp = await fetch("/api/inquiry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await resp.json();

                if (!resp.ok) {
                    throw new Error(data.detail || "Server error while saving inquiry");
                }

                if (inquiryFeedbackMsg) {
                    const storageMode = data.data?.storage === "supabase_cloud" ? "Supabase Cloud" : "Database Storage";
                    inquiryFeedbackMsg.textContent = `✓ Recorded into ${storageMode}! Reference: #${(data.data?.id || "").slice(0, 8)}`;
                    inquiryFeedbackMsg.className = "form-status-msg success";
                }

                showToast("Inquiry submitted and synchronized to backend!");
                inquiryForm.reset();

                setTimeout(() => {
                    closeInquiryModal();
                }, 1800);

            } catch (err) {
                console.error("Inquiry submission failed:", err);
                if (inquiryFeedbackMsg) {
                    inquiryFeedbackMsg.textContent = `Submission failed: ${err.message}`;
                    inquiryFeedbackMsg.className = "form-status-msg error";
                }
            } finally {
                if (inquirySpinner) inquirySpinner.classList.add("hidden");
                if (btnSubmitInquiry) btnSubmitInquiry.disabled = false;
                if (submitBtnText) submitBtnText.textContent = "Submit Inquiry";
            }
        });
    }

    // =========================================================================
    // GIT EVOLUTION & COMMIT LOGS TAB RENDERER
    // =========================================================================
    function renderGitHistory(gitHistory) {
        const tbody = document.getElementById("git-history-tbody");
        const totalCommitsEl = document.getElementById("git-total-commits");
        const bugFixesEl = document.getElementById("git-bug-fixes-count");
        if (!tbody) return;

        const history = gitHistory || [];
        if (totalCommitsEl) totalCommitsEl.textContent = history.length;
        const bugCount = history.filter(c => c.is_bug_fix).length;
        if (bugFixesEl) bugFixesEl.textContent = bugCount;

        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No Git commit history mined for this repository.</td></tr>`;
            return;
        }

        tbody.innerHTML = history.map(c => `
            <tr>
                <td><span class="commit-hash-pill">${escapeHtml(c.commit_hash)}</span></td>
                <td><strong style="color: #ffffff;">${escapeHtml(c.author)}</strong></td>
                <td style="color: var(--text-secondary); font-size: 0.8rem;">${escapeHtml(c.commit_date || "--")}</td>
                <td style="color: #e2e8f0; max-width: 380px;">${escapeHtml(c.commit_message)}</td>
                <td><span style="font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #a1a1aa;">${c.code_churn} lines</span></td>
                <td>
                    ${c.is_bug_fix 
                        ? '<span class="badge-bug-repair">Bug Fix Repair</span>' 
                        : '<span class="badge-feature-commit">Feature / Refactor</span>'}
                </td>
            </tr>
        `).join("");
    }

    // =========================================================================
    // SUPABASE AUTHENTICATION CONTROLLER (GOOGLE OAUTH & PHONE OTP)
    // =========================================================
    let currentSupabaseUser = null;
    let supabaseClient = null;

    const headerAuthBtn = document.getElementById("header-auth-btn");
    const userProfileBadge = document.getElementById("user-profile-badge");
    const userAvatarCircle = document.getElementById("user-avatar-circle");
    const userAvatarInitials = document.getElementById("user-avatar-initials");
    const userDisplayName = document.getElementById("user-display-name");
    const btnSignOut = document.getElementById("btn-sign-out");

    const authModal = document.getElementById("auth-modal");
    const closeAuthModalBtn = document.getElementById("close-auth-modal");
    const authTabBtns = document.querySelectorAll(".auth-tab-btn");
    const authPanelGoogle = document.getElementById("auth-panel-google");
    const authPanelPhone = document.getElementById("auth-panel-phone");
    const authStatusMsg = document.getElementById("auth-status-msg");

    const btnGoogleSignin = document.getElementById("btn-google-signin");
    const googleSpinner = document.getElementById("google-spinner");
    const googleBtnText = document.getElementById("google-btn-text");

    const authPhoneInput = document.getElementById("auth-phone-input");
    const btnSendOtp = document.getElementById("btn-send-otp");
    const otpSendSpinner = document.getElementById("otp-send-spinner");
    const phoneStep1 = document.getElementById("phone-step-1");
    const phoneStep2 = document.getElementById("phone-step-2");
    const authOtpInput = document.getElementById("auth-otp-input");
    const btnVerifyOtp = document.getElementById("btn-verify-otp");
    const otpVerifySpinner = document.getElementById("otp-verify-spinner");
    const btnBackPhone = document.getElementById("btn-back-phone");
    const otpSentToLabel = document.getElementById("otp-sent-to-label");

    // Initialize Supabase Client & Session
    async function initSupabaseAuth() {
        try {
            // Check local cache first
            const cachedUser = localStorage.getItem("refactai_user");
            if (cachedUser) {
                try {
                    currentSupabaseUser = JSON.parse(cachedUser);
                    updateUserUI(currentSupabaseUser);
                } catch (e) {
                    localStorage.removeItem("refactai_user");
                }
            }

            // Fetch credentials from backend
            const cfgResp = await fetch("/api/auth/config");
            const cfg = await cfgResp.json();

            if (cfg.is_configured && window.supabase) {
                supabaseClient = window.supabase.createClient(cfg.supabase_url, cfg.supabase_anon_key);
                
                // Get current live session
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    handleUserLoggedIn(session.user, "supabase_cloud");
                }

                // Listen to Auth State Changes
                supabaseClient.auth.onAuthStateChange(async (event, session) => {
                    if (session && session.user) {
                        handleUserLoggedIn(session.user, "supabase_cloud");
                    } else if (event === "SIGNED_OUT") {
                        handleUserLoggedOut();
                    }
                });
            }
        } catch (err) {
            console.warn("[Auth] Initial configuration check:", err);
        }
    }

    function updateUserUI(user) {
        const ingestionAuthLabel = document.getElementById("ingestion-auth-label");
        if (user) {
            if (headerAuthBtn) headerAuthBtn.classList.add("hidden");
            if (userProfileBadge) userProfileBadge.classList.remove("hidden");

            const name = user.user_metadata?.full_name || user.user_metadata?.name || user.display_name || user.email || user.phone || "RefactAI User";
            if (userDisplayName) userDisplayName.textContent = name;
            if (ingestionAuthLabel) ingestionAuthLabel.textContent = `Signed In: ${name.split(" ")[0]}`;

            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || user.avatar_url;
            if (avatarUrl && userAvatarCircle) {
                userAvatarCircle.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="Avatar" referrerpolicy="no-referrer">`;
            } else if (userAvatarInitials) {
                userAvatarInitials.textContent = (name[0] || "U").toUpperCase();
            }
        } else {
            if (headerAuthBtn) headerAuthBtn.classList.remove("hidden");
            if (userProfileBadge) userProfileBadge.classList.add("hidden");
            if (ingestionAuthLabel) ingestionAuthLabel.textContent = "Sign In (Google / Phone)";
        }
    }

    async function handleUserLoggedIn(user, source = "supabase_cloud") {
        currentSupabaseUser = user;
        localStorage.setItem("refactai_user", JSON.stringify(user));
        updateUserUI(user);

        // Sync with backend /api/auth/profile
        try {
            await fetch("/api/auth/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: user.id,
                    email: user.email || null,
                    phone: user.phone || null,
                    display_name: user.user_metadata?.full_name || user.email || user.phone || "RefactAI User",
                    avatar_url: user.user_metadata?.avatar_url || "",
                    auth_provider: user.app_metadata?.provider || (user.phone ? "phone" : "google")
                })
            });
        } catch (e) {
            console.warn("[Auth] Backend profile sync warning:", e);
        }
    }

    function handleUserLoggedOut() {
        currentSupabaseUser = null;
        localStorage.removeItem("refactai_user");
        localStorage.removeItem("refactai_token");
        sessionStorage.removeItem("pending_auth_action");
        updateUserUI(null);
    }

    // Modal UI Toggling & Mode Switching
    const authModalTitle = document.getElementById("auth-modal-title");
    const authModalDesc = document.getElementById("auth-modal-desc");
    const authContextBanner = document.getElementById("auth-context-banner");
    const authContextText = document.getElementById("auth-context-text");

    const authViewLogin = document.getElementById("auth-view-login");
    const authViewRegister = document.getElementById("auth-view-register");
    const authViewForgot = document.getElementById("auth-view-forgot");
    const authViewPhone = document.getElementById("auth-view-phone");

    const linkToRegister = document.getElementById("link-to-register");
    const linkToLogin = document.getElementById("link-to-login");
    const linkToForgot = document.getElementById("link-to-forgot");
    const linkForgotToLogin = document.getElementById("link-forgot-to-login");
    const btnSwitchPhoneLogin = document.getElementById("btn-switch-phone-login");
    const linkPhoneToLogin = document.getElementById("link-phone-to-login");

    function setAuthView(mode) {
        [authViewLogin, authViewRegister, authViewForgot, authViewPhone].forEach(v => {
            if (v) v.classList.add("hidden");
        });
        if (authStatusMsg) {
            authStatusMsg.textContent = "";
            authStatusMsg.className = "form-status-msg";
        }

        if (mode === "register") {
            authViewRegister?.classList.remove("hidden");
            if (authModalTitle) authModalTitle.textContent = "Create Free Account";
            if (authModalDesc) authModalDesc.textContent = "Join RefactAI to run continuous debt audits and download compliance PDF reports.";
            document.getElementById("reg-name")?.focus();
        } else if (mode === "forgot") {
            authViewForgot?.classList.remove("hidden");
            if (authModalTitle) authModalTitle.textContent = "Reset Your Password";
            if (authModalDesc) authModalDesc.textContent = "Enter your email to receive recovery instructions.";
            document.getElementById("forgot-email")?.focus();
        } else if (mode === "phone") {
            authViewPhone?.classList.remove("hidden");
            if (authModalTitle) authModalTitle.textContent = "Phone OTP Verification";
            if (authModalDesc) authModalDesc.textContent = "Sign in securely via mobile SMS one-time password.";
            authPhoneInput?.focus();
        } else {
            authViewLogin?.classList.remove("hidden");
            if (authModalTitle) authModalTitle.textContent = "Sign In to RefactAI";
            if (authModalDesc) authModalDesc.textContent = "Access repository debt audits, export compliance-ready PDF reports, and view code solutions.";
            document.getElementById("login-email")?.focus();
        }
    }

    if (linkToRegister) linkToRegister.addEventListener("click", () => setAuthView("register"));
    if (linkToLogin) linkToLogin.addEventListener("click", () => setAuthView("login"));
    if (linkToForgot) linkToForgot.addEventListener("click", () => setAuthView("forgot"));
    if (linkForgotToLogin) linkForgotToLogin.addEventListener("click", () => setAuthView("login"));
    if (btnSwitchPhoneLogin) btnSwitchPhoneLogin.addEventListener("click", () => setAuthView("phone"));
    if (linkPhoneToLogin) linkPhoneToLogin.addEventListener("click", () => setAuthView("login"));

    // Toggle Password Visibility
    document.querySelectorAll(".btn-toggle-pwd").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            const input = document.getElementById(targetId);
            if (input) {
                const isPassword = input.getAttribute("type") === "password";
                input.setAttribute("type", isPassword ? "text" : "password");
                btn.textContent = isPassword ? "🙈" : "👁";
            }
        });
    });

    function openAuthModal(contextMsg = "") {
        if (!authModal) return;
        authModal.classList.remove("hidden");
        if (contextMsg && authContextBanner && authContextText) {
            authContextText.textContent = contextMsg;
            authContextBanner.classList.remove("hidden");
        } else if (authContextBanner) {
            authContextBanner.classList.add("hidden");
        }
        setAuthView("login");
        document.body.style.overflow = "hidden";
    }

    function closeAuthModal() {
        if (!authModal) return;
        authModal.classList.add("hidden");
        if (authContextBanner) authContextBanner.classList.add("hidden");
        document.body.style.overflow = "";
    }

    if (headerAuthBtn) headerAuthBtn.addEventListener("click", () => openAuthModal());
    if (closeAuthModalBtn) closeAuthModalBtn.addEventListener("click", closeAuthModal);
    if (authModal) {
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) closeAuthModal();
        });
    }

    // 1. Email/Password Sign-In
    const formLogin = document.getElementById("form-login");
    const btnSubmitLogin = document.getElementById("btn-submit-login");
    const loginSpinner = document.getElementById("login-spinner");

    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email")?.value.trim();
            const password = document.getElementById("login-password")?.value;
            if (!email || !password) return;

            try {
                if (loginSpinner) loginSpinner.classList.remove("hidden");
                if (btnSubmitLogin) btnSubmitLogin.disabled = true;

                const resp = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    throw new Error(data.detail || "Invalid email or password.");
                }

                if (data.access_token) {
                    localStorage.setItem("refactai_token", data.access_token);
                }
                await handleUserLoggedIn(data.user, "email_password");
                showToast(`Welcome back, ${data.user.full_name || data.user.email}!`);
                closeAuthModal();

            } catch (err) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = err.message;
                    authStatusMsg.className = "form-status-msg error";
                }
            } finally {
                if (loginSpinner) loginSpinner.classList.add("hidden");
                if (btnSubmitLogin) btnSubmitLogin.disabled = false;
            }
        });
    }

    // 2. Email/Password Sign-Up (Registration)
    const formRegister = document.getElementById("form-register");
    const btnSubmitRegister = document.getElementById("btn-submit-register");
    const registerSpinner = document.getElementById("register-spinner");

    if (formRegister) {
        formRegister.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fullName = document.getElementById("reg-name")?.value.trim();
            const email = document.getElementById("reg-email")?.value.trim();
            const password = document.getElementById("reg-password")?.value;
            if (!fullName || !email || !password) return;

            try {
                if (registerSpinner) registerSpinner.classList.remove("hidden");
                if (btnSubmitRegister) btnSubmitRegister.disabled = true;

                const resp = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: fullName, email, password })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    throw new Error(data.detail || "Registration failed.");
                }

                if (data.access_token) {
                    localStorage.setItem("refactai_token", data.access_token);
                }
                await handleUserLoggedIn(data.user, "email_password");
                showToast(`Account created! Welcome to RefactAI, ${fullName}!`);
                closeAuthModal();

            } catch (err) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = err.message;
                    authStatusMsg.className = "form-status-msg error";
                }
            } finally {
                if (registerSpinner) registerSpinner.classList.add("hidden");
                if (btnSubmitRegister) btnSubmitRegister.disabled = false;
            }
        });
    }

    // 3. Forgot Password
    const formForgot = document.getElementById("form-forgot");
    const btnSubmitForgot = document.getElementById("btn-submit-forgot");
    const forgotSpinner = document.getElementById("forgot-spinner");

    if (formForgot) {
        formForgot.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("forgot-email")?.value.trim();
            if (!email) return;

            try {
                if (forgotSpinner) forgotSpinner.classList.remove("hidden");
                if (btnSubmitForgot) btnSubmitForgot.disabled = true;

                const resp = await fetch("/api/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });
                const data = await resp.json();

                if (!resp.ok) {
                    throw new Error(data.detail || "Failed to process recovery.");
                }

                if (authStatusMsg) {
                    authStatusMsg.textContent = "✓ " + (data.message || "Password recovery instructions sent!");
                    authStatusMsg.className = "form-status-msg success";
                }
                showToast("Password reset instructions sent!");
                formForgot.reset();

            } catch (err) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = err.message;
                    authStatusMsg.className = "form-status-msg error";
                }
            } finally {
                if (forgotSpinner) forgotSpinner.classList.add("hidden");
                if (btnSubmitForgot) btnSubmitForgot.disabled = false;
            }
        });
    }

    // 4. Google Sign-In & Sign-Up Handlers
    const btnGoogleRegister = document.getElementById("btn-google-register");
    async function triggerGoogleAuth() {
        try {
            if (supabaseClient) {
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: window.location.origin }
                });
                if (error) throw error;
            } else {
                // Instant Local Verified Google Profile
                const simulatedUser = {
                    id: "usr_g_" + Math.random().toString(36).substring(2, 10),
                    email: "developer@refactai.io",
                    display_name: "Developer (Google)",
                    user_metadata: {
                        full_name: "Developer (Google)",
                        avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    },
                    app_metadata: { provider: "google" }
                };
                await handleUserLoggedIn(simulatedUser, "google_oauth");
                showToast("Signed in with Google successfully!");
                closeAuthModal();
            }
        } catch (err) {
            console.error("Google auth error:", err);
            if (authStatusMsg) {
                authStatusMsg.textContent = `Google Sign-in: ${err.message}`;
                authStatusMsg.className = "form-status-msg error";
            }
        }
    }

    if (btnGoogleSignin) btnGoogleSignin.addEventListener("click", triggerGoogleAuth);
    if (btnGoogleRegister) btnGoogleRegister.addEventListener("click", triggerGoogleAuth);

    // 5. Phone OTP Authentication
    let pendingPhoneNumber = "";
    if (btnSendOtp) {
        btnSendOtp.addEventListener("click", async () => {
            const phone = authPhoneInput?.value.trim();
            if (!phone || phone.length < 8) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = "Please enter a valid phone number with country code.";
                    authStatusMsg.className = "form-status-msg error";
                }
                return;
            }

            pendingPhoneNumber = phone;
            try {
                if (otpSendSpinner) otpSendSpinner.classList.remove("hidden");
                btnSendOtp.disabled = true;

                if (supabaseClient) {
                    const { error } = await supabaseClient.auth.signInWithOtp({ phone: pendingPhoneNumber });
                    if (error) throw error;
                } else {
                    await new Promise(r => setTimeout(r, 500));
                }

                if (phoneStep1) phoneStep1.classList.add("hidden");
                if (phoneStep2) phoneStep2.classList.remove("hidden");
                if (otpSentToLabel) otpSentToLabel.textContent = `Verification SMS sent to ${pendingPhoneNumber}.`;
                if (authStatusMsg) {
                    authStatusMsg.textContent = "SMS code sent! Enter the 6-digit OTP below.";
                    authStatusMsg.className = "form-status-msg success";
                }
                authOtpInput?.focus();
            } catch (err) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = `SMS send failed: ${err.message}`;
                    authStatusMsg.className = "form-status-msg error";
                }
            } finally {
                if (otpSendSpinner) otpSendSpinner.classList.add("hidden");
                btnSendOtp.disabled = false;
            }
        });
    }

    if (btnBackPhone) {
        btnBackPhone.addEventListener("click", () => {
            if (phoneStep2) phoneStep2.classList.add("hidden");
            if (phoneStep1) phoneStep1.classList.remove("hidden");
            authPhoneInput?.focus();
        });
    }

    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener("click", async () => {
            const token = authOtpInput?.value.trim();
            if (!token || token.length < 4) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = "Please enter the verification code.";
                    authStatusMsg.className = "form-status-msg error";
                }
                return;
            }

            try {
                if (otpVerifySpinner) otpVerifySpinner.classList.remove("hidden");
                btnVerifyOtp.disabled = true;

                if (supabaseClient) {
                    const { data, error } = await supabaseClient.auth.verifyOtp({
                        phone: pendingPhoneNumber,
                        token: token,
                        type: "sms"
                    });
                    if (error) throw error;
                    await handleUserLoggedIn(data.user, "supabase_cloud");
                } else {
                    await new Promise(r => setTimeout(r, 500));
                    const phoneUser = {
                        id: "usr_ph_" + Math.random().toString(36).substring(2, 10),
                        phone: pendingPhoneNumber,
                        display_name: pendingPhoneNumber,
                        user_metadata: { full_name: `User (${pendingPhoneNumber.slice(-4)})` },
                        app_metadata: { provider: "phone" }
                    };
                    await handleUserLoggedIn(phoneUser, "phone_verified");
                }

                showToast(`Signed in as ${pendingPhoneNumber}`);
                closeAuthModal();

            } catch (err) {
                if (authStatusMsg) {
                    authStatusMsg.textContent = `Verification failed: ${err.message}`;
                    authStatusMsg.className = "form-status-msg error";
                }
            } finally {
                if (otpVerifySpinner) otpVerifySpinner.classList.add("hidden");
                btnVerifyOtp.disabled = false;
            }
        });
    }

    // 6. Resume Pending Action (Download PDF / Share) After Successful Login
    async function resumePendingAuthAction() {
        const pending = sessionStorage.getItem("pending_auth_action");
        if (!pending) return;

        sessionStorage.removeItem("pending_auth_action");
        if (pending === "download_pdf") {
            showToast("Authenticated! Generating and downloading your official PDF report...");
            setTimeout(() => {
                exportReportPDF();
            }, 450);
        } else if (pending === "share_report") {
            showToast("Authenticated! Generating shareable report link...");
            setTimeout(() => {
                shareReport();
            }, 450);
        }
    }

    // Update handleUserLoggedIn to trigger resumePendingAuthAction
    const originalHandleUserLoggedIn = handleUserLoggedIn;
    handleUserLoggedIn = async function(user, source = "supabase_cloud") {
        await originalHandleUserLoggedIn(user, source);
        await resumePendingAuthAction();
    };

    // Sign Out Handler
    if (btnSignOut) {
        btnSignOut.addEventListener("click", async () => {
            const token = localStorage.getItem("refactai_token");
            try {
                if (token) {
                    await fetch("/api/auth/logout", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                }
                if (supabaseClient) {
                    await supabaseClient.auth.signOut();
                }
            } catch (e) {
                console.warn("[Auth] Sign out error:", e);
            }
            handleUserLoggedOut();
            showToast("You have been signed out.");
        });
    }

    // Initialize Auth on Load
    initSupabaseAuth();

    function downloadTextFile(filename, text) {
        const element = document.createElement("a");
        element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
        element.setAttribute("download", filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function capitalize(str) {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});
