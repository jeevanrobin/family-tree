/**
 * FamilyTreeApp Component — Medida Digital Family Platform
 * Milestone 2B: Full local store, CRUD modals, automatic data-driven layout,
 * backup/restore, safe deletion, rich profiles (stories, events, photos, documents),
 * and responsive spatial lineage canvas.
 */

import React, { Suspense, lazy, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFamilyTree } from '../hooks/useFamilyTree.js';
import TreeHeader from './TreeHeader.jsx';
import FamilyTreeCanvas from './FamilyTreeCanvas.jsx';
import PersonDetails from './PersonDetails.jsx';
import ZoomControls from './ZoomControls.jsx';
import IntroOverlay from './react-bits/IntroOverlay.jsx';
import ClickSpark from './react-bits/ClickSpark.jsx';
import GuidedTourModal from './GuidedTourModal.jsx';

// M2A Modals
import AddPersonModal from './modals/AddPersonModal.jsx';
import EditPersonModal from './modals/EditPersonModal.jsx';
import DeletePersonModal from './modals/DeletePersonModal.jsx';
import DataManagementModal from './modals/DataManagementModal.jsx';

// M2B Modals
import StoryModal from './modals/StoryModal.jsx';
import EventModal from './modals/EventModal.jsx';
import PhotoModal from './modals/PhotoModal.jsx';
import DocumentModal from './modals/DocumentModal.jsx';
import PhotoLightbox from './modals/PhotoLightbox.jsx';
import DocumentViewerModal from './modals/DocumentViewerModal.jsx';
import GlobalSearchModal from './GlobalSearchModal.jsx';
import RelationshipFinderModal from './modals/RelationshipFinderModal.jsx';
import TreePosterModal from './modals/TreePosterModal.jsx';
import ChangeHistoryModal from './modals/ChangeHistoryModal.jsx';
import DuplicatesModal from './modals/DuplicatesModal.jsx';
import { canEditPerson } from '../auth/roles.js';
import familyStore from '../store/FamilyStore.js';
import { useOptionalFamily } from '../auth/FamilyContext.jsx';
import { indexedDBManager } from '../store/local/indexedDBManager.js';
import { FAMILY_ID_KEY } from '../store/repository/index.js';

// Secondary views load on demand; the tree view ships with the app.
const FamilyTimelineView = lazy(() => import('./timeline/FamilyTimelineView.jsx'));
const FamilyMemoriesView = lazy(() => import('./memories/FamilyMemoriesView.jsx'));
const FamilyArchiveView = lazy(() => import('./archive/FamilyArchiveView.jsx'));
const FamilyInsightsView = lazy(() => import('./insights/FamilyInsightsView.jsx'));

function ViewLoading() {
  return (
    <div className="ft-view-loading" role="status" aria-live="polite">
      <span className="ft-view-loading__spinner" aria-hidden="true" />
      <span className="ft-view-loading__label">Loading…</span>
    </div>
  );
}

export default function FamilyTreeApp({ isLocalMode = false, initialView = 'tree', activeFamily: activeFamilyProp = null }) {
  const {
    persons,
    relationships,
    generations,
    layout,
    selectedId,
    selectedPerson,
    immediateFamilyMap,
    constellationMap,
    ancestryLineage,
    relatedIds,
    selectPerson,
    deselectPerson,
    focusMode,
    setFocusMode,
    toggleBranch,
    expandAll,
    collapseAll,
    expandAncestorsOf,
    addPerson,
    updatePerson,
    deletePerson,
    addRelationship,
    addStory,
    updateStory,
    deleteStory,
    addLifeEvent,
    updateLifeEvent,
    deleteLifeEvent,
    addPhoto,
    deletePhoto,
    setPrimaryPhoto,
    addDocument,
    updateDocument,
    deleteDocument,
    selectedPersonStories,
    selectedPersonEvents,
    selectedPersonPhotos,
    selectedPersonDocuments,
    setSiblingOrder,
    resetToSampleData,
    clearAllData,
    exportData,
    importData,
  } = useFamilyTree();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const [activeGenFilter, setActiveGenFilter] = useState(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Person the "How are we related?" finder starts from (null = closed)
  const [relFinderFrom, setRelFinderFrom] = useState(null);
  const [posterOpen, setPosterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [isArrangeMode, setIsArrangeMode] = useState(false);

  const handleToggleArrangeMode = useCallback(() => {
    setIsArrangeMode((prev) => !prev);
  }, []);

  // M2A Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalRelativeId, setAddModalRelativeId] = useState(null);
  const [addModalRelType, setAddModalRelType] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(null);

  const [dataModalOpen, setDataModalOpen] = useState(false);

  // M2B Modal States
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  // M4A Global Search Palette States
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [detailsInitialSection, setDetailsInitialSection] = useState('overview');

  // Safe consumption of active family for family-scoped search history
  const familyContext = useOptionalFamily();
  const activeFamily = activeFamilyProp || familyContext?.activeFamily;

  // Name shown as the author of this device's changes in the change history.
  const currentUser = familyContext?.user;
  useEffect(() => {
    const meta = currentUser?.user_metadata || {};
    familyStore.setHistoryActor(
      meta.display_name || meta.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'You')
    );
  }, [currentUser]);
  const activeFamilyId = activeFamily?.id || (isLocalMode ? 'local' : 'default');

  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('medida_intro_shown');
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('medida_theme') || 'dark';
  });

  const [isReducedMotion, setIsReducedMotion] = useState(() => {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  });

  const location = useLocation();
  const navigate = useNavigate();

  // Derive viewMode directly from the URL route as the single source of truth
  const viewMode = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes('/insights')) return 'insights';
    if (pathname.includes('/archive')) return 'archive';
    if (pathname.includes('/memories')) return 'memories';
    if (pathname.includes('/timeline')) return 'timeline';
    return initialView || 'tree';
  }, [location.pathname, initialView]);

  // Extract familyId from URL if present (/app/family/:familyId/...)
  const routeFamilyId = useMemo(() => {
    const match = location.pathname.match(/\/app\/family\/([^/?#]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const basePath = routeFamilyId ? `/app/family/${routeFamilyId}` : '/app';

  // Derive activeStoryId directly from URL
  const activeStoryId = useMemo(() => {
    const match = location.pathname.match(/\/(?:app\/family\/[^/?#]+\/|app\/)memories\/([^/?#]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const handleSwitchView = useCallback(
    (mode, subId = null) => {
      let targetPath = basePath;
      if (mode === 'insights') {
        targetPath = `${basePath}/insights`;
      } else if (mode === 'archive') {
        targetPath = subId ? `${basePath}/archive/photo/${subId}` : `${basePath}/archive`;
      } else if (mode === 'memories') {
        targetPath = subId ? `${basePath}/memories/${subId}` : `${basePath}/memories`;
      } else if (mode === 'timeline') {
        targetPath = `${basePath}/timeline`;
      } else {
        targetPath = basePath;
      }

      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    },
    [basePath, location.pathname, navigate]
  );

  const handleSelectStoryId = useCallback(
    (storyId) => {
      const targetPath = storyId ? `${basePath}/memories/${storyId}` : `${basePath}/memories`;
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    },
    [basePath, location.pathname, navigate]
  );

  // Sync archive deep links when route updates (direct URL loading or back/forward)
  useEffect(() => {
    const pathname = location.pathname;
    const photoMatch = pathname.match(/\/(?:app\/family\/[^/?#]+\/|app\/)archive\/photo\/([^/?#]+)/);
    const docMatch = pathname.match(/\/(?:app\/family\/[^/?#]+\/|app\/)archive\/document\/([^/?#]+)/);
    if (photoMatch) {
      const ph = familyStore.getPhotoById?.(photoMatch[1]) || (familyStore.photos || []).find((p) => String(p.id) === photoMatch[1]);
      if (ph) {
        setLightboxPhotos([ph]);
        setLightboxIndex(0);
        setLightboxOpen(true);
      }
    } else if (docMatch) {
      const doc = familyStore.getDocumentById?.(docMatch[1]) || (familyStore.documents || []).find((d) => String(d.id) === docMatch[1]);
      if (doc) {
        setViewingDoc(doc);
        setDocViewerOpen(true);
      }
    }
  }, [location.pathname]);

  // Handle initial deep-links on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/app/archive/photo/')) {
        const photoMatch = path.match(/\/app\/archive\/photo\/([^/?#]+)/);
        if (photoMatch) {
          const ph = familyStore.getPhotoById?.(photoMatch[1]) || (familyStore.photos || []).find((p) => String(p.id) === photoMatch[1]);
          if (ph) {
            setLightboxPhotos([ph]);
            setLightboxIndex(0);
            setLightboxOpen(true);
          }
        }
      } else if (path.includes('/app/archive/document/')) {
        const docMatch = path.match(/\/app\/archive\/document\/([^/?#]+)/);
        if (docMatch) {
          const doc = familyStore.getDocumentById?.(docMatch[1]) || (familyStore.documents || []).find((d) => String(d.id) === docMatch[1]);
          if (doc) {
            setViewingDoc(doc);
            setDocViewerOpen(true);
          }
        }
      }
    }
  }, []);

  const canvasRef = useRef(null);

  // Sync theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `ft-theme-${theme}`;
    localStorage.setItem('medida_theme', theme);
  }, [theme]);

  // Handle intro dismissal
  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    sessionStorage.setItem('medida_intro_shown', 'true');
    setTimeout(() => {
      canvasRef.current?.reset();
    }, 80);
  }, []);

  const handleClearLocalCache = useCallback(async () => {
    if (familyContext?.clearLocalCache) {
      await familyContext.clearLocalCache();
    } else {
      await indexedDBManager.clearAllDatabases();
      localStorage.removeItem('family-tree-data-v2');
      localStorage.removeItem('family-tree-data-v1');
      clearAllData();
    }
  }, [familyContext, clearAllData]);

  const handleFullReset = useCallback(async () => {
    localStorage.removeItem('family-tree-data-v2');
    localStorage.removeItem('family-tree-data-v1');
    localStorage.removeItem(FAMILY_ID_KEY);
    await indexedDBManager.clearAllDatabases();
    familyStore.loadFromData([], [], [], [], [], []);
    clearAllData();
  }, [clearAllData]);

  // Handle person selection with smooth camera glide & auto-drawer
  const handleSelectPerson = useCallback(
    (personId, section = 'overview') => {
      selectPerson(personId);
      setDetailsInitialSection(section);
      setDetailsOpen(true);
      setTimeout(() => {
        canvasRef.current?.focusFamily(personId);
      }, 40);
    },
    [selectPerson]
  );

  // Global search keyboard shortcuts (Cmd/Ctrl + K and /)
  useEffect(() => {
    function handleGlobalSearchKeys(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    }
    window.addEventListener('keydown', handleGlobalSearchKeys);
    return () => window.removeEventListener('keydown', handleGlobalSearchKeys);
  }, []);

  // M4A Search Navigation Handlers
  const handleNavigatePerson = useCallback(
    (personId, section = 'overview') => {
      if (personId) {
        expandAncestorsOf(personId);
      }
      handleSwitchView('tree');
      handleSelectPerson(personId, section);
    },
    [expandAncestorsOf, handleSwitchView, handleSelectPerson]
  );

  const handleNavigatePersonFromTimeline = useCallback(
    (personId) => {
      handleSwitchView('tree');
      handleSelectPerson(personId, 'overview');
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigatePersonFromMemories = useCallback(
    (personId) => {
      handleSwitchView('tree');
      handleSelectPerson(personId, 'overview');
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigatePersonFromArchive = useCallback(
    (personId) => {
      handleSwitchView('tree');
      handleSelectPerson(personId, 'overview');
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigateEventFromArchive = useCallback(
    (eventId) => {
      handleSwitchView('timeline');
    },
    [handleSwitchView]
  );

  const handleNavigateStoryFromArchive = useCallback(
    (storyId) => {
      handleSwitchView('memories', storyId);
    },
    [handleSwitchView]
  );

  const handleNavigatePersonFromInsights = useCallback(
    (personId) => {
      handleSwitchView('tree');
      handleSelectPerson(personId, 'overview');
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigateEventFromInsights = useCallback(
    (eventId) => {
      handleSwitchView('timeline');
    },
    [handleSwitchView]
  );

  const handleNavigateStoryFromInsights = useCallback(
    (story) => {
      if (story?.id) {
        handleSwitchView('memories', story.id);
      } else {
        handleSwitchView('memories');
      }
    },
    [handleSwitchView]
  );

  const handleNavigatePhotoFromInsights = useCallback(
    (photo) => {
      if (photo?.id) {
        handleSwitchView('archive', photo.id);
      } else {
        handleSwitchView('archive');
      }
    },
    [handleSwitchView]
  );

  const handleNavigateDocFromInsights = useCallback(
    (doc) => {
      setViewingDoc(doc);
      setDocViewerOpen(true);
    },
    []
  );

  const handleNavigateStory = useCallback(
    (story) => {
      if (story?.id) {
        handleSwitchView('memories', story.id);
      } else if (story?.personId) {
        handleSwitchView('tree');
        handleSelectPerson(story.personId, 'story');
      }
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigateEvent = useCallback(
    (event) => {
      if (event?.personId) {
        handleSwitchView('tree');
        handleSelectPerson(event.personId, 'events');
      }
    },
    [handleSwitchView, handleSelectPerson]
  );

  const handleNavigatePhoto = useCallback(
    (photo) => {
      if (photo?.personId) {
        handleSelectPerson(photo.personId, 'photos');
      }
      const personPhotos = photo?.personId ? familyStore.getPhotosForPerson(photo.personId) : [photo];
      const photoIdx = personPhotos.findIndex((p) => p.id === photo?.id);
      setLightboxPhotos(personPhotos.length > 0 ? personPhotos : [photo]);
      setLightboxIndex(Math.max(0, photoIdx));
      setLightboxOpen(true);
    },
    [handleSelectPerson]
  );

  const handleNavigateDocument = useCallback((doc) => {
    setViewingDoc(doc);
    setDocViewerOpen(true);
  }, []);

  const handleNavigateRelationship = useCallback(
    (rel) => {
      const primaryId = rel?.personAId || rel?.parentId || rel?.personId1;
      if (primaryId) {
        handleSelectPerson(primaryId, 'family');
      }
    },
    [handleSelectPerson]
  );

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
  }, []);

  const handleDeselect = useCallback(() => {
    deselectPerson();
    setDetailsOpen(false);
  }, [deselectPerson]);

  // Generation quick jump
  const handleSelectGenFilter = useCallback((genNumber) => {
    setActiveGenFilter(genNumber);
    if (genNumber === null) {
      canvasRef.current?.reset();
    } else {
      canvasRef.current?.focusGeneration(genNumber);
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleToggleReducedMotion = useCallback(() => {
    setIsReducedMotion((m) => !m);
  }, []);

  // Guided Tour Handlers
  const handleStartTour = useCallback(() => {
    setIsTourOpen(true);
    setDetailsOpen(false);
  }, []);

  const handleCloseTour = useCallback(() => {
    setIsTourOpen(false);
    deselectPerson();
    setTimeout(() => {
      canvasRef.current?.reset();
    }, 100);
  }, [deselectPerson]);

  const handleTourStepChange = useCallback(
    (stepData) => {
      if (stepData.featuredPersonId) {
        selectPerson(stepData.featuredPersonId);
        setTimeout(() => {
          canvasRef.current?.focusOn(stepData.featuredPersonId);
        }, 50);
      } else {
        canvasRef.current?.focusGeneration(stepData.gen);
      }
    },
    [selectPerson]
  );

  // CRUD Actions Handlers
  const handleOpenAddModal = useCallback((relativeId = null, relType = null) => {
    setAddModalRelativeId(relativeId);
    setAddModalRelType(relType);
    setAddModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((person) => {
    const latestPerson = (person?.id && familyStore.getPersonById(person.id)) || person;
    setEditingPerson(latestPerson);
    setEditModalOpen(true);
  }, []);

  const handleOpenDeleteModal = useCallback((person) => {
    setDeletingPerson(person);
    setDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback((personId) => {
    deletePerson(personId);
    setDetailsOpen(false);
    setTimeout(() => {
      canvasRef.current?.reset();
    }, 100);
  }, [deletePerson]);

  // M2B Story Handlers
  const handleOpenStoryModal = useCallback((person, story = null) => {
    setEditingPerson(person);
    setEditingStory(story);
    setStoryModalOpen(true);
  }, []);

  const handleSaveStory = useCallback((storyData) => {
    if (storyData.id) {
      updateStory(storyData.id, storyData);
    } else {
      addStory(storyData);
    }
  }, [addStory, updateStory]);

  // M2B Event Handlers
  const handleOpenEventModal = useCallback((person, event = null) => {
    setEditingPerson(person);
    setEditingEvent(event);
    setEventModalOpen(true);
  }, []);

  const handleSaveEvent = useCallback((eventData) => {
    if (eventData.id) {
      updateLifeEvent(eventData.id, eventData);
    } else {
      addLifeEvent(eventData);
    }
  }, [addLifeEvent, updateLifeEvent]);

  // M2B Photo Handlers
  const handleOpenPhotoModal = useCallback((person) => {
    setEditingPerson(person);
    setPhotoModalOpen(true);
  }, []);

  const handleOpenLightbox = useCallback((photosList, index) => {
    setLightboxPhotos(photosList);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // M2B Document Handlers
  const handleOpenDocModal = useCallback((person, doc = null) => {
    setEditingPerson(person);
    setEditingDoc(doc);
    setDocModalOpen(true);
  }, []);

  const handleSaveDoc = useCallback((docData) => {
    if (docData.id) {
      updateDocument(docData.id, docData);
    } else {
      addDocument(docData);
    }
  }, [addDocument, updateDocument]);

  const handleOpenDocViewer = useCallback((doc) => {
    setViewingDoc(doc);
    setDocViewerOpen(true);
  }, []);

  return (
    <div className={`ft-app ft-app--theme-${theme} ${isReducedMotion ? 'ft-app--reduced-motion' : ''}`}>
      {/* Cinematic Intro Overlay (First Load) */}
      {showIntro && (
        <IntroOverlay
          title={activeFamily?.name?.toUpperCase() || (isLocalMode ? 'FAMILY TREE' : 'FAMILY ARCHIVE')}
          tagline="Generations. Stories. Memories."
          metadata="PRIVATE DIGITAL FAMILY PLATFORM"
          onComplete={handleIntroComplete}
          isReducedMotion={isReducedMotion}
        />
      )}
      <Suspense fallback={<ViewLoading />}>
      {viewMode === 'insights' ? (
        <FamilyInsightsView
          store={familyStore}
          onNavigateToPerson={handleNavigatePersonFromInsights}
          onNavigateToEvent={handleNavigateEventFromInsights}
          onNavigateToStory={handleNavigateStoryFromInsights}
          onNavigateToPhoto={handleNavigatePhotoFromInsights}
          onNavigateToDocument={handleNavigateDocFromInsights}
          onNavigateToTree={() => handleSwitchView('tree')}
          onNavigateToTimeline={() => handleSwitchView('timeline')}
          onNavigateToMemories={() => handleSwitchView('memories')}
          onNavigateToArchive={() => handleSwitchView('archive')}
          onOpenSearch={() => setSearchModalOpen(true)}
          activeView={viewMode}
          onNavigateView={handleSwitchView}
          isLocalMode={isLocalMode}
        />
      ) : viewMode === 'archive' ? (
        <FamilyArchiveView
          store={familyStore}
          onNavigateToPerson={handleNavigatePersonFromArchive}
          onNavigateToEvent={handleNavigateEventFromArchive}
          onNavigateToStory={handleNavigateStoryFromArchive}
          onOpenPhoto={(photos, idx = 0) => {
            const list = Array.isArray(photos) ? photos : [photos];
            setLightboxPhotos(list);
            setLightboxIndex(idx);
            setLightboxOpen(true);
          }}
          onOpenDocumentViewer={(doc) => {
            setViewingDoc(doc);
            setDocViewerOpen(true);
          }}
          onReturnToTree={() => handleSwitchView('tree')}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenAddPhoto={() => {
            const firstPerson = selectedPerson || persons[0] || null;
            if (firstPerson) {
              handleOpenPhotoModal(firstPerson);
            }
          }}
          onOpenAddDocument={() => {
            const firstPerson = selectedPerson || persons[0] || null;
            if (firstPerson) {
              handleOpenDocModal(firstPerson, null);
            }
          }}
          canEdit={!isLocalMode ? (familyContext?.currentRole !== 'viewer') : true}
          activeView={viewMode}
          onNavigateView={handleSwitchView}
          isLocalMode={isLocalMode}
        />
      ) : viewMode === 'memories' ? (
        <FamilyMemoriesView
          store={familyStore}
          activeStoryId={activeStoryId}
          onSelectStoryId={handleSelectStoryId}
          onNavigateToPerson={handleNavigatePersonFromMemories}
          onNavigateToEvent={() => {
            handleSwitchView('timeline');
          }}
          onOpenPhoto={(photos, idx = 0) => {
            const list = Array.isArray(photos) ? photos : [photos];
            setLightboxPhotos(list);
            setLightboxIndex(idx);
            setLightboxOpen(true);
          }}
          onOpenDocumentViewer={(doc) => {
            setViewingDoc(doc);
            setDocViewerOpen(true);
          }}
          onReturnToTree={() => handleSwitchView('tree')}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenAddStory={() => {
            const firstPerson = selectedPerson || persons[0] || null;
            if (firstPerson) {
              handleOpenStoryModal(firstPerson, null);
            }
          }}
          onEditStory={(story) => {
            const person = story.personId ? familyStore.getPersonById(story.personId) : (selectedPerson || persons[0] || null);
            handleOpenStoryModal(person, story);
          }}
          onDeleteStory={deleteStory}
          canEdit={!isLocalMode ? (familyContext?.currentRole !== 'viewer') : true}
          activeView={viewMode}
          onNavigateView={handleSwitchView}
          isLocalMode={isLocalMode}
        />
      ) : viewMode === 'timeline' ? (
        <FamilyTimelineView
          store={familyStore}
          onNavigateToPerson={handleNavigatePersonFromTimeline}
          onOpenPhoto={(photo) => {
            setLightboxPhotos([photo]);
            setLightboxIndex(0);
            setLightboxOpen(true);
          }}
          onReturnToTree={() => handleSwitchView('tree')}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenAddEvent={() => {
            const firstPerson = persons[0] || null;
            if (firstPerson) {
              handleOpenEventModal(firstPerson, null);
            }
          }}
          activeView={viewMode}
          onNavigateView={handleSwitchView}
          isLocalMode={isLocalMode}
          isReducedMotion={isReducedMotion}
        />
      ) : (
        <>
          {/* Clean, Focused Header */}
          <TreeHeader
            totalPersons={persons.length}
            totalGenerations={generations.size}
            onSelectPerson={handleSelectPerson}
            selectedId={selectedId}
            onDeselect={handleDeselect}
            onOpenAddModal={() => handleOpenAddModal(null, null)}
            onOpenDataModal={() => setDataModalOpen(true)}
            onOpenPoster={() => setPosterOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenDuplicates={() => setDuplicatesOpen(true)}
            onStartTour={handleStartTour}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            isReducedMotion={isReducedMotion}
            onToggleReducedMotion={handleToggleReducedMotion}
            activeGenFilter={activeGenFilter}
            onSelectGenFilter={handleSelectGenFilter}
            onOpenSearch={() => setSearchModalOpen(true)}
            isLocalMode={isLocalMode}
            activeView={viewMode}
            onNavigateView={handleSwitchView}
            isArrangeMode={isArrangeMode}
            onToggleArrangeMode={handleToggleArrangeMode}
          />

          {/* Main Interactive Stage — Family Tree as Hero */}
          <main className="ft-main">
            {isArrangeMode && (
              <div className="ft-arrange-banner" role="status" aria-live="polite">
                <div className="ft-arrange-banner__info">
                  <span className="ft-arrange-banner__dot" />
                  <span className="ft-arrange-banner__text">
                    <strong>Arrange Family Mode:</strong> Drag cards or use ◀ / ▶ to reorder siblings within their cohort. Relationships remain unchanged.
                  </span>
                </div>
                <button
                  type="button"
                  className="ft-arrange-banner__done-btn"
                  onClick={handleToggleArrangeMode}
                  title="Save and exit arrange mode"
                >
                  Done
                </button>
              </div>
            )}

            <FamilyTreeCanvas
              ref={canvasRef}
              layout={layout}
              selectedId={selectedId}
              immediateFamilyMap={immediateFamilyMap}
              constellationMap={constellationMap}
              ancestryLineage={ancestryLineage}
              relatedIds={relatedIds}
              onSelectPerson={handleSelectPerson}
              onDeselect={handleDeselect}
              onScaleChange={setCanvasScale}
              onToggleBranch={toggleBranch}
              isReducedMotion={isReducedMotion}
              isArrangeMode={isArrangeMode}
              setSiblingOrder={setSiblingOrder}
            />

            {/* Empty Canvas Prompt for New Users */}
            {persons.length === 0 && (
              <div className="ft-empty-canvas-prompt">
                <div style={{ fontSize: '2.8rem', marginBottom: '16px' }}>🌳</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ft-text-primary)', marginBottom: '8px' }}>
                  Welcome to Your Family Archive
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--ft-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                  Your canvas is clean and ready. Add your first ancestor, relative, or yourself to start building your generational lineage.
                </p>
                <ClickSpark
                  sparkColor="var(--ft-accent)"
                  sparkCount={5}
                  sparkSize={4}
                  duration={240}
                  disabled={isReducedMotion}
                >
                  <button
                    type="button"
                    className="ft-form-btn ft-form-btn--primary"
                    onClick={() => handleOpenAddModal(null, null)}
                    style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add First Family Member</span>
                  </button>
                </ClickSpark>
              </div>
            )}

            {/* Floating Zoom & Canvas Controls */}
            <div className="ft-bottom-tools-group">
              <ZoomControls
                onZoomIn={() => canvasRef.current?.zoomIn()}
                onZoomOut={() => canvasRef.current?.zoomOut()}
                onReset={() => canvasRef.current?.reset()}
                onFocusSelected={() => selectedId && canvasRef.current?.focusOn(selectedId)}
                onFitBranch={() => selectedId && canvasRef.current?.fitBranch(selectedId)}
                focusMode={focusMode}
                onSetFocusMode={setFocusMode}
                onExpandAll={expandAll}
                onCollapseAll={collapseAll}
                hasSelection={Boolean(selectedId)}
                scale={canvasScale}
                isReducedMotion={isReducedMotion}
              />
            </div>

            {/* Slide-in Profile Details Dossier */}
            {detailsOpen && selectedPerson && (
              <PersonDetails
                person={selectedPerson}
                onFindRelationship={(id) => setRelFinderFrom(id)}
                relationships={relationships}
                stories={selectedPersonStories}
                lifeEvents={selectedPersonEvents}
                photos={selectedPersonPhotos}
                documents={selectedPersonDocuments}
                onClose={handleCloseDetails}
                onSelectPerson={handleSelectPerson}
                onCenterPerson={(id) => canvasRef.current?.focusOn(id)}
                onEditPerson={handleOpenEditModal}
                onDeletePerson={handleOpenDeleteModal}
                onAddRelative={(relId, type) => handleOpenAddModal(relId, type)}
                onOpenStoryModal={handleOpenStoryModal}
                onOpenEventModal={handleOpenEventModal}
                onOpenPhotoModal={handleOpenPhotoModal}
                onOpenDocumentModal={handleOpenDocModal}
                onOpenLightbox={handleOpenLightbox}
                onOpenDocumentViewer={handleOpenDocViewer}
                onDeleteStory={deleteStory}
                onDeleteEvent={deleteLifeEvent}
                initialSection={detailsInitialSection}
                isLocalMode={isLocalMode}
              />
            )}
          </main>
        </>
      )}
      </Suspense>

        <DuplicatesModal
          isOpen={duplicatesOpen}
          onClose={() => setDuplicatesOpen(false)}
          canMerge={isLocalMode || canEditPerson(familyContext?.currentRole)}
          onSelectPerson={(id) => {
            setDuplicatesOpen(false);
            handleSelectPerson(id);
          }}
        />

        <ChangeHistoryModal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          canRestore={isLocalMode || canEditPerson(familyContext?.currentRole)}
          onSelectPerson={(id) => {
            setHistoryOpen(false);
            handleSelectPerson(id);
          }}
        />

        <TreePosterModal
          isOpen={posterOpen}
          onClose={() => setPosterOpen(false)}
          familyName={activeFamily?.name || ''}
        />

        <RelationshipFinderModal
          isOpen={relFinderFrom !== null}
          fromPersonId={relFinderFrom}
          onClose={() => setRelFinderFrom(null)}
          onSelectPerson={(id) => {
            setRelFinderFrom(null);
            handleSelectPerson(id);
          }}
        />

        {/* Explore Family Guided Tour Journey */}
        <GuidedTourModal
          isOpen={isTourOpen}
          onClose={handleCloseTour}
          onStepChange={handleTourStepChange}
          isReducedMotion={isReducedMotion}
        />

        {/* Milestone 2A Modals */}
        <AddPersonModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddPerson={addPerson}
          onAddRelationship={addRelationship}
          initialRelativeId={addModalRelativeId}
          initialRelType={addModalRelType}
          existingPersons={persons}
        />

        <EditPersonModal
          key={editingPerson?.id || 'edit-modal'}
          isOpen={editModalOpen}
          person={(editingPerson?.id && familyStore.getPersonById(editingPerson.id)) || editingPerson}
          onClose={() => setEditModalOpen(false)}
          onUpdatePerson={updatePerson}
        />

        <DeletePersonModal
          isOpen={deleteModalOpen}
          person={deletingPerson}
          onClose={() => setDeleteModalOpen(false)}
          onConfirmDelete={handleConfirmDelete}
        />

        <DataManagementModal
          isOpen={dataModalOpen}
          onClose={() => setDataModalOpen(false)}
          onExportData={exportData}
          onImportData={importData}
          onResetData={resetToSampleData}
          onClearData={clearAllData}
          onClearLocalCache={handleClearLocalCache}
          onFullReset={handleFullReset}
        />

        {/* Milestone 2B Modals */}
        <StoryModal
          isOpen={storyModalOpen}
          person={editingPerson}
          story={editingStory}
          onClose={() => setStoryModalOpen(false)}
          onSaveStory={handleSaveStory}
          isLocalMode={isLocalMode}
          cloudFamilyId={activeFamily?.id || null}
        />

        <EventModal
          isOpen={eventModalOpen}
          person={editingPerson}
          event={editingEvent}
          onClose={() => setEventModalOpen(false)}
          onSaveEvent={handleSaveEvent}
        />

        <PhotoModal
          isOpen={photoModalOpen}
          person={editingPerson}
          onClose={() => setPhotoModalOpen(false)}
          onSavePhoto={addPhoto}
        />

        <DocumentModal
          isOpen={docModalOpen}
          person={editingPerson}
          document={editingDoc}
          onClose={() => setDocModalOpen(false)}
          onSaveDocument={handleSaveDoc}
        />

        <PhotoLightbox
          isOpen={lightboxOpen}
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(nextIdx) => setLightboxIndex(nextIdx)}
          onSetPrimary={setPrimaryPhoto}
          onDeletePhoto={deletePhoto}
        />

        <DocumentViewerModal
          isOpen={docViewerOpen}
          document={viewingDoc}
          onClose={() => setDocViewerOpen(false)}
          onEdit={(doc) => handleOpenDocModal(selectedPerson, doc)}
          onDelete={deleteDocument}
        />

        {/* Milestone M4A — Global Family Search & Discovery Palette */}
        <GlobalSearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onNavigatePerson={handleNavigatePerson}
          onNavigateStory={handleNavigateStory}
          onNavigateEvent={handleNavigateEvent}
          onNavigatePhoto={handleNavigatePhoto}
          onNavigateDocument={handleNavigateDocument}
          onNavigateRelationship={handleNavigateRelationship}
          familyId={activeFamilyId}
        />
    </div>
  );
}
