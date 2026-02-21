#!/usr/bin/env ruby
require "xcodeproj"
require "pathname"

PROJECT_PATH = "BayitPlus.xcodeproj"
project = Xcodeproj::Project.open(PROJECT_PATH)
project_root = Pathname.new(File.dirname(File.expand_path(PROJECT_PATH)))

tv_target = project.targets.find { |t| t.name == "BayitPlusTVApp" }
abort "ERROR: Target not found" unless tv_target

tv_sources = tv_target.source_build_phase

# Check what's in tvOS target for DownloadManager
puts "Current DownloadManager files in tvOS target:"
tv_sources.files.each do |bf|
  ref = bf.file_ref
  next unless ref
  rp = ref.real_path.to_s rescue nil
  next unless rp
  puts "  #{rp}" if rp.include?("DownloadManager")
end

# Files to ensure are in tvOS target
files_to_add = [
  "BayitPlusApp/Services/DownloadManager+Delegate.swift",
  "BayitPlusApp/Services/DownloadManager.swift",
]

# Collect existing refs
all_refs = {}
project.files.each do |ref|
  next unless ref.path&.end_with?(".swift")
  rp = ref.real_path.to_s rescue nil
  all_refs[rp] = ref if rp
end

tv_existing = Set.new
tv_sources.files.each do |bf|
  ref = bf.file_ref
  next unless ref
  rp = ref.real_path.to_s rescue nil
  tv_existing << rp if rp
end

files_to_add.each do |rel|
  full_path = project_root.join(rel).to_s
  if tv_existing.include?(full_path)
    puts "Already in tvOS: #{rel}"
    next
  end

  file_ref = all_refs[full_path]
  unless file_ref
    puts "ERROR: No file ref found for #{rel}"
    next
  end

  tv_sources.add_file_reference(file_ref, true)
  puts "Added to tvOS: #{rel}"
end

project.save
puts "Project saved."
