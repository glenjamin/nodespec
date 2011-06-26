require 'rubygems'
require 'bundler'
Bundler.setup

desc "Broadly useless code statistics"
task(:stats) do
  loc = `find lib | xargs cat 2> /dev/null | grep . -c`.to_f
  lot = `find spec | xargs cat 2> /dev/null | grep . -c`.to_f
  lok = `find features | grep .feature | xargs cat 2> /dev/null | grep . -c`.to_f

  puts <<-STATS % [loc, lot, lok, lot / loc, (lot + lok) / loc]
Lines of Code: %d
Lines of Test: %d
Lines of Cucumber: %d
Code to Test Ratio: 1:%0.4f
Code to Test+Cucumber Ratio: 1:%0.4f
  STATS
end
