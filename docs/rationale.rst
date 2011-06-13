Rationale
=========

There are many existing frameworks for NodeJS already out there, but none
of them quite did what I was looking for. Some were originally built pre-node,
and thus their node support was somewhat "bolted-on", while others seemed to
get a bit carried away with the whole asynchronous nature a little bit.

My complaints can be summarised as:

 *  Running tests asynchronously isn't particularly useful
    (if you try and use mocks it can even be harmful)

 *  Not being able to test asynchronous code is even less useful

Why not X?
==========

Vows
  Vows only evaluates the topic once, and then runs all the vows and
  sub-contexts against the initial topic. Which is fine for integration
  testing but doesn't work well with mocking.

nodeunit
  Nodeunit actually satisfies most of the criteria above, except it doesn't
  have RSpec-style nested contexts. If I didn't have the urge to roll my own,
  nodeunit is what I'd be using.
