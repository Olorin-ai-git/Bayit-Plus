#!/usr/bin/env ruby
require "xcodeproj"

PROJECT_PATH = "BayitPlus.xcodeproj"
project = Xcodeproj::Project.open(PROJECT_PATH)

REMOVE_FILES = [
  "BayitPlusTVApp/Views/Avatar/TVAvatarModeView+ColorHelpers.swift",
]

removed = 0
REMOVE_FILES.each do |suffix|
  project.targets.each do |target|
    phase = target.source_build_phase
    phase.files.each do |bf|
      ref = bf.file_ref
      next unless ref
      rp = ref.real_path.to_s rescue nil
      next unless rp&.end_with?(suffix.gsub("/", File::SEPARATOR))
      phase.remove_build_file(bf)
      removed += 1
      puts "Removed '#{File.basename(suffix)}' from #{target.name}"
    end
  end
  project.files.each do |ref|
    rp = ref.real_path.to_s rescue nil
    next unless rp&.end_with?(suffix.gsub("/", File::SEPARATOR))
    ref.remove_from_project
    puts "Removed file reference: #{suffix}"
  end
end

project.save
puts "Done. Removed #{removed} build file entries."
