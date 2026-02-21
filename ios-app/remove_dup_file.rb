#!/usr/bin/env ruby
require "xcodeproj"

PROJECT_PATH = "BayitPlus.xcodeproj"
project = Xcodeproj::Project.open(PROJECT_PATH)

# File to remove from project (duplicate - identical to CategoryRepository+Convenience.swift)
dup_path = "BayitPlusApp/Repositories/CategoryRepository+Judaism.swift"

removed = 0
project.targets.each do |target|
  phase = target.source_build_phase
  phase.files.each do |bf|
    ref = bf.file_ref
    next unless ref
    rel = ref.path rescue nil
    next unless rel
    if bf.file_ref&.real_path.to_s.end_with?(dup_path.gsub("/", File::SEPARATOR))
      phase.remove_build_file(bf)
      removed += 1
      puts "Removed from target: #{target.name}"
    end
  end
end

# Also remove the file reference from the project
project.files.each do |ref|
  rp = ref.real_path.to_s rescue nil
  next unless rp&.end_with?("CategoryRepository+Judaism.swift")
  ref.remove_from_project
  puts "Removed file reference"
end

project.save
puts "Done. Removed #{removed} build file entries."
