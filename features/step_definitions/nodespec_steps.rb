When %r(^I run nodespec with "([^"]*)"$) do |args|
  When "I run `node #{args}`"
end
