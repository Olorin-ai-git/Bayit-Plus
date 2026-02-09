#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'BayitPlus.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'BayitPlusApp' }

puts "Cleaning up duplicate file references..."

# Files to fix
files_to_ensure = {
  'AISubtitlesPickerView.swift' => 'BayitPlusApp/Views/Player/Subtitles',
  'SubtitlePaneView.swift' => 'BayitPlusApp/Views/Player/Subtitles',
  'SplitSubtitleOverlayView.swift' => 'BayitPlusApp/Views/Player/Subtitles',
  'SplitSubtitleLanguagePickerView.swift' => 'BayitPlusApp/Views/Player/Subtitles',
  'SubtitleRepository+AIGeneration.swift' => 'BayitPlusApp/Repositories'
}

files_to_ensure.each do |filename, expected_dir|
  puts "\nProcessing: #{filename}"

  # Find ALL file references with this name
  matching_refs = project.files.select { |f| f.path&.include?(filename) || f.display_name == filename }

  puts "  Found #{matching_refs.count} reference(s)"

  # Remove all of them first
  matching_refs.each do |ref|
    puts "  Removing: #{ref.real_path || ref.path}"
    target.source_build_phase.files.each do |build_file|
      if build_file.file_ref == ref
        build_file.remove_from_project
      end
    end
    ref.remove_from_project unless ref.nil?
  end

  # Now add the file correctly - navigate to the proper group
  group = project.main_group
  expected_dir.split('/').each do |group_name|
    found_group = group.groups.find { |g| g.name == group_name || g.path == group_name }
    if found_group
      group = found_group
    else
      group = group.new_group(group_name, group_name)
    end
  end

  # Add the file with just the filename (relative to its group)
  file_ref = group.new_file(filename)
  puts "  Added: #{filename} to group #{expected_dir}"

  # Add to build phase
  target.source_build_phase.add_file_reference(file_ref)
  puts "  Added to build phase"
end

# Save the project
project.save

puts "\n✓ Project cleaned up successfully!"
