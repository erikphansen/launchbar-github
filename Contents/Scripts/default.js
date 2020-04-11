class GitHubLB {
  constructor() {
    let handle = Action.preferences.viewerHandle || '';

    this.defaultMenuItems = [
      {
        title: 'My Open Pull Requests',
        icon: 'pullRequestTemplate.png',
        action: 'openAccountPullRequests',
        actionArgument: handle,
        actionReturnsItems: true,
      },
      {
        title: 'My VA.gov Issues',
        icon: 'thingsTemplate.png',
        action: 'openMyVaGovIssues',
        actionArgument: handle,
        actionReturnsItems: true,
      },
      {
        title: 'My Issues',
        icon: 'issueTemplate.png',
        action: 'openAccountIssues',
        actionArgument: handle,
        actionReturnsItems: true,
      },
      {
        title: 'My Repositories',
        icon: 'repoTemplate.png',
        action: 'openAccountRepositories',
        actionArgument: handle,
        actionReturnsItems: true,
      },
      {
        title: 'My Gists',
        icon: 'gistTemplate.png',
        action: 'openAccountGists',
        actionArgument: handle,
        actionReturnsItems: true,
      },
      {
        title: 'Settings',
        icon: 'gearTemplate.png',
        action: 'openSettingsMenu',
        actionReturnsItems: true,
      }
    ];
  }

  run(input, options) {
    if (input.length > 0) {
      let matchedDefaultMenuItems = this.matchingDefaultMenuItems(input);

      if (matchedDefaultMenuItems.length > 0) {
        return matchedDefaultMenuItems.concat(this.conflictingHandleMenuItem(input));
      } else {
        return this.displayMenuItemFor(input);
      }
    } else {
      return this.defaultMenuItems;
    }
  }

  matchingDefaultMenuItems(input) {
    return this.defaultMenuItems.filter(function(item) {
      let regex = new RegExp(input, 'i');
      return item.title.match(regex);
    });
  }

  conflictingHandleMenuItem(handle) {
    return [{
      title: '@' + handle,
      subtitle: 'Looking for the user @' + handle + '?',
      alwaysShowsSubtitle: true,
      icon: 'personTemplate.png',
      action: 'openAccountMenu',
      actionArgument: handle,
    }];
  }

  displayMenuItemFor(input) {
    const GITHUB_LINK_FORMAT  = /^https?:\/\/((www|gist|raw|developer)\.)?github\.(io|com)/;
    const ISSUE_OR_PR_FORMAT  = /^([\w-\.]+)\/([\w-\.]+)#(\d+)?\s*([\w-]+)?$/;
    const REPOSITORY_FORMAT   = /^([\w-\.]+)\/([\w-\.]+)?\s*([\w-]+)?$/;
    const COMMIT_SHA_FORMAT   = /^\b[0-9a-f]{5,40}\b$/;
    const ACCOUNT_FORMAT      = /^([\w-]+)\s*([\w-]+)?$/;

    let match;

    // Matching:
    // https://github.com/bswinnerton/dotfiles/blob/master/ack/ackrc.symlink#L6
    if (input.match(GITHUB_LINK_FORMAT)) {
      return [
        {
          title: 'Shorten link',
          icon: 'linkTemplate.png',
          action: 'shortenLink',
          actionArgument: input,
        },
        {
          title: 'Add to things',
          icon: 'thingsTemplate.png',
          action: 'addToThings',
          actionArgument: input,
        }
      ];
    }

    // Matching:
    // rails/rails#123
    // rails/rails/issues/123
    // rails/rails/pull/123
    else if (match = input.match(ISSUE_OR_PR_FORMAT)) {
      let owner       = new Account(match[1]);
      let repository  = new Repository(owner, match[2]);
      let issue       = new Issue(repository, match[3]);
      return this.openIssueMenu(issue, match[4]);
    }

    // Matching:
    // rails/rails
    else if (match = input.match(REPOSITORY_FORMAT)) {
      let owner = new Account(match[1]);
      return this.openRepositoriesMenu(owner, match[2]);
    }

    // Matching:
    // 911a93ac
    // 911a93ac26c4f5919d1ebdf67a9e3db31c5b9dce
    else if (match = input.match(COMMIT_SHA_FORMAT)) {
      let commit = new Commit(match[0]);
      return this.openCommitPullRequestsMenu(commit);
    }

    // Matching:
    // rails
    else if (match = input.match(ACCOUNT_FORMAT)) {
      let account = new Account(match[1]);
      return this.openAccountMenu(account, match[2]);
    }
  }

  openSettingsMenu(input) {
    return [
      {
        title: 'Set GitHub access token from clipboard',
        icon: 'keyTemplate.png',
        action: 'setToken',
        actionArgument: LaunchBar.getClipboardString(),
      },
    ];
  }

  openIssueMenu(issue) {
    if (issue.number) {
      let fetchedIssue = Issue.fetch(issue.repository, issue.number);
      return [fetchedIssue.toMenuItem()];
    } else {
      return [];
    }
  }

  openRepositoriesMenu(account, selection) {
    if (LaunchBar.options.commandKey == 1) {
      let repository = new Repository(account, selection);
      LaunchBar.openURL(repository.url);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      let repositories = account.repositories();

      if (selection) {
        repositories = repositories.filter(function(repository) {
          let regex = new RegExp(selection, 'i');
          return repository.name.match(regex);
        });

        // Sort repositories such that if the exact selection is present, it
        // floats to the top.
        repositories = repositories.sort(function(a,b) {
          if (a.name == selection) {
            return -1
          } else {
            return 0
          }
        });
      }

      return repositories.map(function(repository) {
        let menuItem = repository.toMenuItem();
        delete menuItem.url;
        menuItem.action = 'openRepositoryMenu';
        menuItem.actionArgument = repository.nameWithOwner;
        menuItem.actionReturnsItems = true;
        return menuItem;
      });
    }
  }

  openRepositoryMenu(repository, secondarySelection) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(repository.url);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      let repositoryMenuItems = [
        {
          title: 'View Repository',
          subtitle: repository.nameWithOwner,
          alwaysShowsSubtitle: true,
          icon: 'repoTemplate.png',
          url: repository.url,
        },
        {
          title: 'View Issues',
          icon: 'issueTemplate.png',
          action: 'openRepositoryIssues',
          actionArgument: repository.nameWithOwner,
          actionReturnsItems: true,
        },
        {
          title: 'View Pull Requests',
          icon: 'pullRequestTemplate.png',
          action: 'openRepositoryPullRequests',
          actionArgument: repository.nameWithOwner,
          actionReturnsItems: true,
        }
      ];

      if (secondarySelection) {
        return repositoryMenuItems.filter(function(item) {
          let regex = new RegExp(secondarySelection, 'i');
          return item.title.match(regex);
        });
      } else {
        return repositoryMenuItems;
      }
    }
  }

  openRepositoryPullRequests(repository) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(repository.pullRequestsURL);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Pull Requests',
          icon: 'pullRequestTemplate.png',
          url: repository.pullRequestsURL,
        }
      ].concat(repository.pullRequests().map(function(pullRequest) {
        return pullRequest.toMenuItem();
      }));
    }
  }

  openRepositoryIssues(repository) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(repository.issuesURL);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Issues',
          icon: 'issueTemplate.png',
          url: repository.issuesURL,
        }
      ].concat(repository.issues().map(function(issue) {
        return issue.toMenuItem();
      }));
    }
  }

  openCommitPullRequestsMenu(commit) {
    let pullRequests = commit.pullRequests();

    if (pullRequests.length > 1) {
      return pullRequests.map(function(pr) { return pr.toMenuItem(); });
    } else if (pullRequests.length === 1) {
      return [pullRequests[0].toMenuItem()];
    } else {
      return [
        {
          title: 'Search for commit: ' + commit.sha,
          url: commit.searchURL,
          icon: 'commitTemplate.png', //TODO
        },
      ];
    }
  }

  openAccountMenu(account, secondarySelection) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(account.profileURL);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      let accountMenuItems = [
        {
          title: 'View Profile',
          subtitle: account.handle,
          alwaysShowsSubtitle: true,
          icon: 'personTemplate.png',
          url: account.profileURL,
        },
        {
          title: 'View Repositories',
          icon: 'repoTemplate.png',
          action: 'openAccountRepositories',
          actionArgument: account.login,
          actionReturnsItems: true,
        },
        {
          title: 'View Issues',
          icon: 'issueTemplate.png',
          action: 'openAccountIssues',
          actionArgument: account.login,
          actionReturnsItems: true,
        },
        {
          title: 'View Pull Requests',
          icon: 'pullRequestTemplate.png',
          action: 'openAccountPullRequests',
          actionArgument: account.login,
          actionReturnsItems: true,
        },
        {
          title: 'View Gists',
          icon: 'gistTemplate.png',
          action: 'openAccountGists',
          actionArgument: account.login,
          actionReturnsItems: true,
        },
        {
          title: 'View Projects',
          icon: 'projectTemplate.png',
          action: 'openOrganizationProjects',
          actionArgument: account.login,
          actionReturnsItems: true,
        }
      ];

      if (secondarySelection) {
        return accountMenuItems.filter(function(item) {
          let regex = new RegExp(secondarySelection, 'i');
          return item.title.match(regex);
        });
      } else {
        return accountMenuItems;
      }
    }
  }

  openAccountRepositoriesMenu(login) {
    let account = new Account(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(account.repositoriesURL);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Repositories',
          icon: 'reposTemplate.png',
          url: account.repositoriesURL,
        }
      ].concat(account.repositories().map(function(repository) {
        return repository.toMenuItem();
      }));
    }
  }

  openAccountPullRequests(login) {
    let account = new Account(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL('https://github.com/pulls');
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Pull Requests',
          icon: 'pullRequestTemplate.png',
          url: 'https://github.com/pulls',
        }
      ].concat(account.pullRequests().map(function(pullRequest) {
        return pullRequest.toMenuItem();
      }));
    }
  }

  openAccountIssues(login) {
    let account = new Account(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL('https://github.com/issues');
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Issues',
          icon: 'issueTemplate.png',
          url: 'https://github.com/issues',
        }
      ].concat(account.issues().map(function(issue) {
        return issue.toMenuItem();
      }));
    }
  }

  openMyVaGovIssues(login) {
    let account = new Account(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL('https://github.com/issues/assigned');
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All VA.gov Issues Assigned To Me',
          icon: 'issueTemplate.png',
          url: 'https://github.com/department-of-veterans-affairs/va.gov-team/issues/assigned/erikphansen',
        }
      ].concat(account.assignedVaGovIssues().map(function(issue) {
        return issue.toMenuItem();
      }));
    }
  }

  openAccountGists(login) {
    let account = new Account(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL('https://gist.github.com');
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Gists',
          icon: 'gistTemplate.png',
          url: 'https://gist.github.com',
        }
      ].concat(account.gists().map(function(gist) {
        return gist.toMenuItem();
      }));
    }
  }

  openOrganizationProjects(login) {
    let org = new Organization(login);

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(org.projectsURL);
      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      return [
        {
          title: 'View All Projects',
          icon: 'projectTemplate.png',
          url: org.projectsURL,
        }
      ].concat(org.projects().map(function(project) {
        return project.toMenuItem();
      }));
    }
  }

  shortenLink(link) {
    let linkShortener = new LinkShortener(link);
    let shortLink     = linkShortener.run();

    LaunchBar.setClipboardString(shortLink);
    LaunchBar.displayNotification({
      title: 'Copied ' + shortLink + ' to your clipboard',
    });

    LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
  }

  addToThings(link) {
    let resource = new Resource(link).toObject();

    let title     = resource.title;
    let todo      = encodeURIComponent('Review "' + title + '"');
    let url       = encodeURIComponent(resource.url);

    LaunchBar.openURL('things:///add?show-quick-entry=true&title=' + todo + '&notes=' + url);
  }

  setToken(token) {
    Action.preferences.token = token;

    let result = GraphQL.execute(`query { viewer { login } }`);

    if (result.data) {
      let handle = result.data.viewer.login;

      Action.preferences.viewerHandle = handle;

      LaunchBar.displayNotification({
        title: '👋 Hi @' + handle,
        string: 'Your access token was set successfully.',
      });

      LaunchBar.executeAppleScript('tell application "LaunchBar" to hide');
    } else {
      LaunchBar.displayNotification({
        title: 'That looks like an invalid token',
        string: 'Please try again by going back to settings.',
      });
    }
  }
}

GitHubLB.VERSION = 'v' + Action.version + '-' + LaunchBar.version;

let app = new GitHubLB();

function run(argument) {
  return app.run(argument);
}

function runWithString(string) {
  return app.run(string);
}

function runWithURL(url, details) {
  if (details.path.endsWith('setToken')) {
    return app.setToken(details.queryParameters.token);
  } else {
    return app.run(url, details);
  }
}

// Unfortunately when the script output uses an action argument (like
// openAccount does), it needs to be able to find the function from the global
// scope. The following functions are workarounds to the appropriate actions.
//
// https://developer.obdev.at/launchbar-developer-documentation/#/script-output.
function openAccountRepositories(string) {
  return app.openAccountRepositoriesMenu(string);
}

function openAccountPullRequests(string) {
  return app.openAccountPullRequests(string);
}

function openAccountIssues(string) {
  return app.openAccountIssues(string);
}

function openMyVaGovIssues(My) {
  return app.openMyVaGovIssues(My);
}

function openAccountGists(string) {
  return app.openAccountGists(string);
}

function openOrganizationProjects(string) {
  return app.openOrganizationProjects(string);
}

function openAccountMenu(string) {
  return app.openAccountMenu(string);
}

function shortenLink(link, details) {
  return app.shortenLink(link);
}

function addToThings(link) {
  return app.addToThings(link);
}

function openSettingsMenu() {
  return app.openSettingsMenu();
}

function setToken(token) {
  return app.setToken(token);
}

function openRepositoryMenu(nameWithOwner) {
  let match       = nameWithOwner.match(/^(.*)\/(.*)$/);
  let owner       = new Account(match[1]);
  let repository  = new Repository(owner, match[2]);
  return app.openRepositoryMenu(repository);
}

function openRepositoryPullRequests(nameWithOwner) {
  let match       = nameWithOwner.match(/^(.*)\/(.*)$/);
  let owner       = new Account(match[1]);
  let repository  = new Repository(owner, match[2]);
  return app.openRepositoryPullRequests(repository);
}

function openRepositoryIssues(nameWithOwner) {
  let match       = nameWithOwner.match(/^(.*)\/(.*)$/);
  let owner       = new Account(match[1]);
  let repository  = new Repository(owner, match[2]);
  return app.openRepositoryIssues(repository);
}
