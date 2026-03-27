'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type {
  NewspaperEditionWithItemsDto,
  NewspaperEditionDto,
  EditionChannelDto,
} from '@edin/shared';
import { useNewspaperEditions } from '../../../hooks/use-newspaper-editions';
import { useNewspaperEditionItems } from '../../../hooks/use-newspaper-edition-items';
import { HeadlineItem } from './headline-item';
import { SecondaryItemCard } from './secondary-item-card';
import { EditionSidebar } from './edition-sidebar';
import { ReferenceScaleIndicator } from './reference-scale-indicator';
import { NewspaperEmptyState } from './empty-state';
import { EditionTimeline } from './edition-timeline';
import { EditionViewingBanner } from './edition-viewing-banner';
import { NewspaperSkeleton } from './newspaper-skeleton';
import { EditorialCurationPanel } from './editorial-curation-panel';
import { useAuth } from '../../../hooks/use-auth';
import { useVotedItemIds, isItemVoted } from '../../../hooks/use-newspaper-item-voting';

interface NewspaperLayoutProps {
  edition: NewspaperEditionWithItemsDto | null;
}

export function NewspaperLayout({ edition }: NewspaperLayoutProps) {
  const { user } = useAuth();
  const isEditor = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const isAuthenticated = !!user;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- Edition selection state (URL-synced) ---
  const selectedEditionId = useMemo(() => {
    return searchParams.get('edition') ?? null;
  }, [searchParams]);

  const isViewingLatest = selectedEditionId === null;

  // --- Channel filter state (URL-synced, from np-4-6) ---
  const selectedChannelIds = useMemo(() => {
    const param = searchParams.get('channel');
    return param ? param.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // --- Fetch editions list for the timeline ---
  const { data: editionsList } = useNewspaperEditions({ limit: 50 });

  // --- Fetch items for non-latest edition ---
  const {
    data: nonLatestData,
    isLoading: isLoadingEdition,
    isError: editionFetchError,
  } = useNewspaperEditionItems(
    isViewingLatest ? null : selectedEditionId,
    selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
  );

  // --- URL update handlers ---
  const handleFilterChange = useCallback(
    (channelIds: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (channelIds.length === 0) {
        params.delete('channel');
      } else {
        params.set('channel', channelIds.join(','));
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [searchParams, router],
  );

  const handleEditionSelect = useCallback(
    (editionId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // If selecting the latest edition, remove the param
      if (edition && editionId === edition.id) {
        params.delete('edition');
      } else {
        params.set('edition', editionId);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [searchParams, router, edition],
  );

  const handleBackToLatest = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edition');
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [searchParams, router]);

  // --- Determine what to display ---

  // Find the displayed edition's metadata from the editions list
  const selectedEditionMeta: NewspaperEditionDto | null = useMemo(() => {
    if (isViewingLatest) return edition;
    if (!editionsList || !selectedEditionId) return null;
    return editionsList.find((e) => e.id === selectedEditionId) ?? null;
  }, [isViewingLatest, edition, editionsList, selectedEditionId]);

  // Latest edition: client-side filtering (items already loaded via SSR)
  const latestFilteredItems = useMemo(() => {
    if (!edition) return [];
    return selectedChannelIds.length === 0
      ? edition.items
      : edition.items.filter((item) => selectedChannelIds.includes(item.channelId));
  }, [edition, selectedChannelIds]);

  // Determine displayed items
  const displayedItems = useMemo(() => {
    if (isViewingLatest) return latestFilteredItems;
    if (!nonLatestData) return [];
    // For non-latest, items come pre-filtered from the API (when channelIds are passed)
    // But if no channel filter is active, we still need all items
    return nonLatestData.items;
  }, [isViewingLatest, latestFilteredItems, nonLatestData]);

  // Determine displayed channels
  const displayedChannels: EditionChannelDto[] = useMemo(() => {
    if (isViewingLatest) {
      if (edition?.channels && edition.channels.length > 0) {
        return edition.channels;
      }
      // Fallback: derive from items
      if (!edition) return [];
      const counts: Record<string, EditionChannelDto> = {};
      for (const item of edition.items) {
        if (!counts[item.channelId]) {
          counts[item.channelId] = {
            channelId: item.channelId,
            channelName: item.channelName,
            channelType: 'DOMAIN',
            itemCount: 0,
          };
        }
        counts[item.channelId].itemCount++;
      }
      return Object.values(counts).sort((a, b) => a.channelName.localeCompare(b.channelName));
    }
    // Non-latest: channels come from the items response
    return nonLatestData?.channels ?? [];
  }, [isViewingLatest, edition, nonLatestData]);

  // Fetch voted item IDs for authenticated users
  const displayedItemIds = useMemo(() => displayedItems.map((item) => item.id), [displayedItems]);
  const { data: votedItemIds } = useVotedItemIds(isAuthenticated ? displayedItemIds : []);
  const votedSet = useMemo(() => votedItemIds ?? [], [votedItemIds]);

  // Compute filtered significance distribution for reference scale
  const filteredSignificanceDistribution = useMemo(() => {
    if (selectedChannelIds.length === 0) return undefined;
    const dist: Record<string, number> = {};
    for (const item of displayedItems) {
      const key = String(item.significanceScore);
      dist[key] = (dist[key] ?? 0) + 1;
    }
    return dist;
  }, [displayedItems, selectedChannelIds]);

  // --- Render ---

  // Only show empty state if there's no edition at all
  // (don't block timeline when latest has zero items but older editions exist)
  if (!edition) {
    return <NewspaperEmptyState />;
  }

  // Show loading skeleton when fetching a non-latest edition
  const showLoadingSkeleton = !isViewingLatest && isLoadingEdition && !nonLatestData;

  const displayedEdition = selectedEditionMeta ?? edition;
  const [headlineItem, ...secondaryItems] = displayedItems.length > 0 ? displayedItems : [];

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      {/* Page header */}
      <header className="mb-8">
        <h1 className="font-serif text-[1.5rem] md:text-[2rem] font-bold text-text-primary">
          Contributor Newspaper
        </h1>
        <p className="font-sans text-body-sm text-text-tertiary mt-1">
          Edition #{displayedEdition.editionNumber} &middot;{' '}
          {displayedEdition.referenceScaleMetadata.temporalSpanHumanReadable}
        </p>
      </header>

      {/* Edition viewing banner (only when non-latest) */}
      {!isViewingLatest && selectedEditionMeta && (
        <div className="mb-6">
          <EditionViewingBanner edition={selectedEditionMeta} onBackToLatest={handleBackToLatest} />
        </div>
      )}

      {/* Edition timeline */}
      {editionsList && editionsList.length > 1 && (
        <div className="mb-6">
          <EditionTimeline
            editions={editionsList}
            currentEditionId={selectedEditionId ?? edition.id}
            latestEditionId={edition.id}
            onEditionSelect={handleEditionSelect}
            isLoading={isLoadingEdition}
          />
        </div>
      )}

      {/* Reference scale indicator */}
      <div className="mb-6">
        <ReferenceScaleIndicator
          edition={displayedEdition}
          filteredSignificanceDistribution={filteredSignificanceDistribution}
        />
      </div>

      {/* Editorial curation panel (visible to EDITOR/ADMIN) */}
      {isEditor && displayedEdition && displayedItems.length > 0 && (
        <EditorialCurationPanel
          editionId={displayedEdition.id}
          items={displayedItems}
          isEditor={isEditor}
        />
      )}

      {/* Loading skeleton for non-latest edition */}
      {showLoadingSkeleton && <NewspaperSkeleton />}

      {/* Error state for non-latest edition fetch */}
      {!isViewingLatest && editionFetchError && !isLoadingEdition && (
        <div
          className="mb-8 rounded-radius-lg bg-surface-raised border border-status-error/20 p-8 text-center"
          role="alert"
        >
          <p className="text-body text-text-secondary">Failed to load this edition.</p>
          <button
            onClick={handleBackToLatest}
            className="mt-3 text-body-sm font-medium text-accent-primary hover:underline"
          >
            Back to Latest
          </button>
        </div>
      )}

      {!showLoadingSkeleton && (
        <>
          {/* Empty state when no items at all (latest or non-latest) */}
          {displayedItems.length === 0 && selectedChannelIds.length === 0 && !isLoadingEdition && (
            <NewspaperEmptyState />
          )}

          {/* Headline story */}
          {headlineItem && (
            <div className="mb-8">
              <HeadlineItem
                item={headlineItem}
                hasVoted={isItemVoted(votedSet, headlineItem.id)}
                isAuthenticated={isAuthenticated}
              />
            </div>
          )}

          {/* No items match filter */}
          {displayedItems.length === 0 && selectedChannelIds.length > 0 && (
            <div className="mb-8 rounded-radius-lg bg-surface-raised border border-surface-subtle p-8 text-center">
              <p className="text-body text-text-secondary">
                No items match the selected channel filter.
              </p>
              <button
                onClick={() => handleFilterChange([])}
                className="mt-3 text-body-sm text-accent-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Mobile sidebar toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 rounded-radius-md border border-surface-subtle px-4 py-2 text-body-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised min-h-[44px] w-full justify-between"
              aria-expanded={sidebarOpen}
              aria-controls="edition-sidebar-mobile"
            >
              <span>Edition Details & Filters</span>
              <span className="text-text-tertiary">{sidebarOpen ? '\u25B2' : '\u25BC'}</span>
            </button>
            {sidebarOpen && (
              <div id="edition-sidebar-mobile" className="mt-3">
                <EditionSidebar
                  edition={displayedEdition}
                  channels={displayedChannels}
                  selectedChannelIds={selectedChannelIds}
                  onFilterChange={handleFilterChange}
                />
              </div>
            )}
          </div>

          {/* Grid + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            {/* Secondary items grid */}
            {secondaryItems.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {secondaryItems.map((item) => (
                  <SecondaryItemCard
                    key={item.id}
                    item={item}
                    hasVoted={isItemVoted(votedSet, item.id)}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-8">
                <EditionSidebar
                  edition={displayedEdition}
                  channels={displayedChannels}
                  selectedChannelIds={selectedChannelIds}
                  onFilterChange={handleFilterChange}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
