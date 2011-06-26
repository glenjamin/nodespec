require 'rubygems'
require 'bundler'
Bundler.setup

desc "Broadly useless code statistics"
task(:stats) do
  loc = `find lib | xargs cat 2> /dev/null | grep . -c`.to_f
  lot = `find spec | xargs cat 2> /dev/null | grep . -c`.to_f

  puts "Lines of Code: %d\nLines of Test: %d\nCode to Test Ratio: 1:%0.4f" %
    [loc, lot, lot / loc]
end
