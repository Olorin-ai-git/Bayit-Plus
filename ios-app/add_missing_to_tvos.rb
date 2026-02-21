#!/usr/bin/env ruby
require "xcodeproj"
require "pathname"
require "set"

PROJECT_PATH = "BayitPlus.xcodeproj"
TV_TARGET_NAME = "BayitPlusTVApp"
IOS_TARGET_NAME = "BayitPlusApp"

project = Xcodeproj::Project.open(PROJECT_PATH)
project_root = Pathname.new(File.dirname(File.expand_path(PROJECT_PATH)))

tv_target = project.targets.find { |t| t.name == TV_TARGET_NAME }
ios_target = project.targets.find { |t| t.name == IOS_TARGET_NAME }

abort "ERROR: Target not found" unless tv_target && ios_target

tv_sources = tv_target.source_build_phase
ios_sources = ios_target.source_build_phase

# Collect existing target membership
tv_existing = Set.new
tv_sources.files.each do |bf|
  ref = bf.file_ref
  next unless ref
  tv_existing << (ref.real_path.to_s rescue nil)
end
tv_existing.delete(nil)

ios_existing = Set.new
ios_sources.files.each do |bf|
  ref = bf.file_ref
  next unless ref
  ios_existing << (ref.real_path.to_s rescue nil)
end
ios_existing.delete(nil)

puts "tvOS target: #{tv_existing.size} files | iOS target: #{ios_existing.size} files"

# Map real_path -> file_ref for all project file references
all_refs = {}
project.files.each do |ref|
  next unless ref.path&.end_with?(".swift")
  rp = ref.real_path.to_s rescue nil
  all_refs[rp] = ref if rp
end

# Build group cache: filesystem path (relative to project root) -> PBXGroup
group_cache = {}

def walk_groups(group, parent_path, cache)
  if group.path && !group.path.empty?
    current = parent_path ? File.join(parent_path, group.path) : group.path
  else
    current = parent_path
  end
  cache[current] = group if current
  group.groups.each { |child| walk_groups(child, current, cache) }
end

project.main_group.groups.each { |g| walk_groups(g, nil, group_cache) }

# Helper: find or create a PBXGroup for a relative directory path
def find_or_create_group(project, group_cache, rel_dir)
  return group_cache[rel_dir] if group_cache[rel_dir]

  parts = rel_dir.split("/")
  current_path = nil
  current_group = nil

  parts.each_with_index do |part, idx|
    current_path = current_path ? File.join(current_path, part) : part
    if group_cache[current_path]
      current_group = group_cache[current_path]
    elsif current_group
      new_group = current_group.new_group(part, part)
      group_cache[current_path] = new_group
      current_group = new_group
    else
      top = project.main_group.groups.find { |g| g.path == parts[0] || g.display_name == parts[0] }
      if top
        group_cache[parts[0]] = top unless group_cache[parts[0]]
        current_group = top
        if idx > 0
          new_group = current_group.new_group(part, part)
          group_cache[current_path] = new_group
          current_group = new_group
        end
      else
        return nil
      end
    end
  end
  current_group
end

# Helper: add a file to a target's source build phase, creating file ref if needed
def add_file_to_target(project, project_root, group_cache, all_refs, sources_phase, full_path, stats)
  file_ref = all_refs[full_path]

  unless file_ref
    rel_path = Pathname.new(full_path).relative_path_from(project_root).to_s
    dir_path = File.dirname(rel_path)
    file_name = File.basename(rel_path)
    group = find_or_create_group(project, group_cache, dir_path)
    unless group
      stats[:errors] << "No group for: #{rel_path}"
      return
    end
    file_ref = group.new_reference(file_name)
    file_ref.source_tree = "<group>"
    all_refs[full_path] = file_ref
    stats[:new_refs] += 1
  end

  sources_phase.add_file_reference(file_ref, true)
  stats[:added] += 1
end

# ============================================================
# PHASE 1: Add ALL untracked BayitPlusApp files to iOS target
# ============================================================
puts "\n--- Phase 1: Add missing BayitPlusApp files to iOS target ---"
disk_app = Dir.glob(File.join(project_root.to_s, "BayitPlusApp", "**", "*.swift")).sort
ios_stats = { added: 0, new_refs: 0, errors: [] }

disk_app.each do |f|
  next if ios_existing.include?(f)
  add_file_to_target(project, project_root, group_cache, all_refs, ios_sources, f, ios_stats)
end
puts "iOS target: added #{ios_stats[:added]} files (#{ios_stats[:new_refs]} new refs)"

# ============================================================
# PHASE 2: Add BayitPlusTVApp files missing from tvOS target
# ============================================================
puts "\n--- Phase 2: Add missing BayitPlusTVApp files to tvOS target ---"
disk_tv = Dir.glob(File.join(project_root.to_s, "BayitPlusTVApp", "**", "*.swift")).sort
tv_stats = { added: 0, new_refs: 0, errors: [] }

disk_tv.each do |f|
  next if tv_existing.include?(f)
  add_file_to_target(project, project_root, group_cache, all_refs, tv_sources, f, tv_stats)
end
puts "tvOS target: added #{tv_stats[:added]} BayitPlusTVApp files (#{tv_stats[:new_refs]} new refs)"

# ============================================================
# PHASE 3: Add BayitPlusApp shared files to tvOS target
# ============================================================
puts "\n--- Phase 3: Add shared BayitPlusApp files to tvOS target ---"

# Determine which BayitPlusApp files SHOULD be in tvOS target
# Strategy: include files from shared directories, exclude known iOS-only patterns

# Files already in tvOS from BayitPlusApp - get their base names for extension matching
tv_bayitapp_bases = Set.new
tv_existing.each do |f|
  next unless f.include?("/BayitPlusApp/")
  basename = File.basename(f, ".swift")
  tv_bayitapp_bases << basename
  tv_bayitapp_bases << basename.split("+").first if basename.include?("+")
end

# iOS-only excludes: files that should NEVER be in tvOS
ios_only_patterns = [
  # App entry points and iOS-specific app files
  "BayitPlusApp/App/BayitPlusApp.swift",
  "BayitPlusApp/App/BayitPlusApp+Initialization.swift",
  "BayitPlusApp/App/ContentView.swift",
  "BayitPlusApp/App/MainTabView.swift",
  "BayitPlusApp/App/RepositoryProvider.swift",
  "BayitPlusApp/App/AppNetworkConfiguration.swift",
  "BayitPlusApp/App/AppDelegate.swift",
  "BayitPlusApp/App/ActivityDonationService.swift",
  "BayitPlusApp/App/AppAPILogger.swift",
  "BayitPlusApp/App/AppLocationProvider.swift",
  "BayitPlusApp/App/SpotlightIndexer.swift",
  "BayitPlusApp/App/UITestingSupport.swift",
  # CarPlay - entire directory
  "BayitPlusApp/CarPlay/",
  # AppIntents - entire directory (iOS only)
  "BayitPlusApp/AppIntents/",
  # Navigation - iOS has its own, tvOS has BayitPlusTVApp/Navigation
  "BayitPlusApp/Navigation/",
  # iOS-only services
  "BayitPlusApp/Services/ARFaceCaptureSession",
  "BayitPlusApp/Services/AudioPlaybackManager",
  "BayitPlusApp/Services/BiometricAuthService",
  "BayitPlusApp/Services/CrashlyticsService",
  "BayitPlusApp/Services/HapticFeedbackService",
  "BayitPlusApp/Services/LiveActivityManager",
  "BayitPlusApp/Services/MediaPlayerWidgetBridge",
  "BayitPlusApp/Services/PendingIntentHandler",
  "BayitPlusApp/Services/PresenceDetectionService",
  "BayitPlusApp/Services/SleepTimerManager",
  "BayitPlusApp/Services/VoiceCommandRegistry",
  "BayitPlusApp/Services/VoiceInteractionService",
  "BayitPlusApp/Services/WakeWordService",
  "BayitPlusApp/Services/WidgetDataSyncService",
  # iOS-only helpers
  "BayitPlusApp/Helpers/CameraRecordingManager",
  "BayitPlusApp/Helpers/GLBBuilder",
  # Views - tvOS has its own views, exclude ALL BayitPlusApp/Views except the 2 already shared
  "BayitPlusApp/Views/",
]

# The 2 Views files already in tvOS - keep these as allowed
views_allowed = Set.new([
  "BayitPlusApp/Views/Player/DubbingPremiumGateView.swift",
  "BayitPlusApp/Views/Shared/SubtitleFlagsPill.swift",
])

shared_stats = { added: 0, new_refs: 0, skipped: 0, errors: [] }

# Rebuild tv_existing to include Phase 2 additions
tv_existing_updated = Set.new(tv_existing)
tv_sources.files.each do |bf|
  ref = bf.file_ref
  next unless ref
  tv_existing_updated << (ref.real_path.to_s rescue nil)
end
tv_existing_updated.delete(nil)

disk_app.each do |full_path|
  next if tv_existing_updated.include?(full_path)
  
  rel = Pathname.new(full_path).relative_path_from(project_root).to_s
  
  # Check if this is a Views file that's explicitly allowed
  if rel.start_with?("BayitPlusApp/Views/") && !views_allowed.include?(rel)
    shared_stats[:skipped] += 1
    next
  end
  
  # Check against exclusion patterns
  excluded = ios_only_patterns.any? { |pat| rel.start_with?(pat) || rel == pat.chomp("/") }
  if excluded
    shared_stats[:skipped] += 1
    next
  end
  
  add_file_to_target(project, project_root, group_cache, all_refs, tv_sources, full_path, shared_stats)
end

puts "tvOS target: added #{shared_stats[:added]} shared BayitPlusApp files"
puts "Skipped #{shared_stats[:skipped]} iOS-only files"

# ============================================================
# Summary
# ============================================================
puts "\n=== FINAL SUMMARY ==="
puts "iOS target:  #{ios_target.source_build_phase.files.count} files (was #{ios_existing.size})"
puts "tvOS target: #{tv_target.source_build_phase.files.count} files (was #{tv_existing.size})"

all_errors = ios_stats[:errors] + tv_stats[:errors] + shared_stats[:errors]
if all_errors.any?
  puts "Errors: #{all_errors.size}"
  all_errors.each { |e| puts "  #{e}" }
end

project.save
puts "\nProject saved."
