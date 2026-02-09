#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'BayitPlus.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BayitPlusApp' }

# Find the file to remove
file_ref = project.files.find { |f| f.display_name == 'PlayerView+SplitSubtitles.swift' }

if file_ref
  # Remove from build phase
  build_file = target.source_build_phase.files.find { |bf| bf.file_ref == file_ref }
  if build_file
    target.source_build_phase.files.delete(build_file)
    puts "✓ Removed PlayerView+SplitSubtitles.swift from build phase"
  end

  # Remove file reference
  file_ref.remove_from_project
  puts "✓ Removed PlayerView+SplitSubtitles.swift from project"
else
  puts "✗ Could not find PlayerView+SplitSubtitles.swift in project"
end

# Save the project
project.save

puts "\nProject updated successfully!"
