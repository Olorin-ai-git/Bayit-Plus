Contribution Guidelines
=======================
Great to have you here. Whether it's improving documentation, adding a new component, or suggesting an issue that will help us improve, all contributions are welcome!

- [Contribution Expectations](#Contribution-Expectations)
- [Contribution Process](#Contribution-Process)
- [After Contribution is Merged](#After-Contribution-is-Merged)
- [Contact Information](#Contact-Information)

## Contact Information
_Add in information about the owners of this repository and how to contact the team. For example:_

>Here is how you can contact the team:

>* Slack: [#YOUR SLACK CHANNEL](https://olorin-teams.slack.com/archives/FILL_IN_LINK)
>* JIRA: https://jira.olorin.com/browse/[YOUR JIRA SUBMIT POINT]

## Contribution Expectations

#### Adding Functionality or Reporting Bugs
* You can look through the existing issues/bugs in the project and contribute.
* You can report bugs as JIRA issues. Give as much detail as possible. (Logs, stacktraces, versions, etc.)

#### Code Quality Expectations
- Tests: All new code should have correlated tests
- Coverage: Ensure that code coverage does not fall below 85%
- Documentation: Code should be well-documented. What code is doing should be self-explanatory based on coding conventions. Why code is doing something should be explained.
- Code Style: We try to follow [Google's Coding Standards](https://google.github.io/styleguide). It's easiest to format based on existing code you see. We don't enforce this; it's just a guideline

#### SLAs
_Add in information about pull-request and issue request SLAs.  For example:_

>The pull request review SLA is 7 days

## Contribution Process

1. Fork and Clone. From the GitHub UI, fork the project into your user space or another organization. Follow these steps, clone locally and add the upstream remote.
	```text
	$ git clone git@github.olorin.com:ORG/REPOSITORY.git
	$ cd <project>

	## If you have SSH keys set up, then add the SSH URL as an upstream.
	$ git remote add upstream git@github.olorin.com/ORG/REPOSITORY.git

	## If you want to type in your password when fetching from upstream, then add the HTTPS URL as an upstream.
	$ git remote add upstream https://github.olorin.com/ORG/REPOSITORY.git
	```
1. Create a branch (use the Jira project and prefix with "feature/" or "bugfix/").
	```text
	git checkout -b feature/JIRA-1234
	```
1. Make your changes, including documentation. Writing good commit logs is important. Follow the [Local Development](./README.md) steps to get started.
	```text
	A commit log should describe what changed and why. 
	Make sure that the commit message contains the JIRA ticket associated with the change. 
	```
1. Test. Bug fixes and features **must come with tests** and coverage should meet or exceed 85%. Make sure all tests pass. Please do not submit PRs that fail this check.

1. Push your changes to your fork's branch.

1. In GitHub, create a Pull Request to the upstream repository. On your forked repo, click the 'Pull Request' button and fill out the form.  
1. Making a PR will automatically trigger a series of checks against your changes.
1. The team will reach out if they need more information or to make suggestions.


[//]: # (after pr)    

## After Contribution is Merged

Once the PR is good to go, the team will merge it, and you'll be credited as a contributor! Reach out to the team to follow their release cycle. These key questions can help you know what to expect:

>- Are there ownership expectations in preprod/prod for a period of time?
>- When can a contributor expect to see merged code built and deployed to preprod and prod?
>- How can a contributor validate their code changes after changes have been deployed?
