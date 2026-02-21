#!/usr/bin/env ruby
require "xcodeproj"

PROJECT_PATH = "BayitPlus.xcodeproj"
project = Xcodeproj::Project.open(PROJECT_PATH)

# Files to REMOVE from project (duplicates/obsolete - their content is in other files)
# Format: suffix of real_path that uniquely identifies each file
REMOVE_FILES = [
  # Duplicate of DownloadManager+Delegate.swift (same methods)
  "BayitPlusApp/Services/DownloadManager+TaskManagement.swift",
  # Duplicates of VODViewModel+Filtering.swift (same loadMore/refresh/filterItemsByType)
  "BayitPlusApp/ViewModels/VODViewModel+DataLoading.swift",
  "BayitPlusApp/ViewModels/VODViewModel+Pagination.swift",
]

removed_count = 0

REMOVE_FILES.each do |target_suffix|
  # Remove from all target build phases
  project.targets.each do |target|
    phase = target.source_build_phase
    phase.files.each do |bf|
      ref = bf.file_ref
      next unless ref
      rp = ref.real_path.to_s rescue nil
      next unless rp&.end_with?(target_suffix.gsub("/", File::SEPARATOR))
      phase.remove_build_file(bf)
      removed_count += 1
      puts "Removed '#{File.basename(target_suffix)}' from target: #{target.name}"
    end
  end

  # Remove file reference
  project.files.each do |ref|
    rp = ref.real_path.to_s rescue nil
    next unless rp&.end_with?(target_suffix.gsub("/", File::SEPARATOR))
    ref.remove_from_project
    puts "Removed file reference: #{target_suffix}"
  end
end

project.save
puts "\nDone. Removed #{removed_count} build phase entries."
