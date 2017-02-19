include('account.js');
include('issue.js');
include('repository.js');

class App {
  run(input) {
    const SET_TOKEN_FORMAT    = /^!set-token (.*)$/;
    const ISSUE_OR_PR_FORMAT  = /^([^\/]+)\/([^\/#]+)(?:\/pull\/|\/issues\/|#)(\d+)$/;
    const REPOSITORY_FORMAT   = /^([^\/]+)\/([^\/#]+)$/;
    const ACCOUNT_FORMAT      = /^(\w+)$/;

    let match;

    // Matching:
    // set-token <token>
    if (match = input.match(SET_TOKEN_FORMAT)) {
      return this.setToken(match[1])
    }

    // Matching:
    // rails/rails#123
    // rails/rails/issues/123
    // rails/rails/pull/123
    else if (match = input.match(ISSUE_OR_PR_FORMAT)) {
      let owner       = new Account(match[1])
      let repository  = new Repository(owner, match[2]);
      let issue       = new Issue(repository, match[3])
      return this.openIssue(issue);
    }

    // Matching:
    // rails/rails
    else if (match = input.match(REPOSITORY_FORMAT)) {
      let owner       = new Account(match[1])
      let repository  = new Repository(owner, match[2]);
      return this.openRepository(repository);
    }

    // Matching:
    // rails
    else if (match = input.match(ACCOUNT_FORMAT)) {
      let account = new Account(match[1])
      return this.openAccount(account);
    }

    // Matching everything else:
    // rails/rails/tree/master/Gemfile
    else {
      LaunchBar.openURL('https://github.com/' + input);
    }
  }

  setToken(token) {
    Action.preferences.token = token;
    LaunchBar.displayNotification({
      title: 'GitHub access token set successfully'
    });
  }

  openIssue(issue) {
    LaunchBar.openURL(issue.url);
  }

  openRepository(repository) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(repository.url)
    } else {
      return [
        {
          title: 'View Repository',
          subtitle: repository.slug,
          alwaysShowsSubtitle: true,
          icon: 'repo.png',
          url: repository.url,
        },
        {
          title: 'View Issues',
          icon: 'issue.png',
          url: repository.issuesURL,
        },
        {
          title: 'View Pull Requests',
          icon: 'pull-request.png',
          url: repository.pullRequestsURL,
        }
      ]
    }
  }

  openAccount(account) {
    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(account.profileURL)
    } else {
      return [
        {
          title: 'View Profile',
          subtitle: account.handle,
          alwaysShowsSubtitle: true,
          icon: 'person.png',
          url: account.profileURL,
        },
        {
          title: 'View Repositories',
          icon: 'repo.png',
          action: 'openAccountRepositories',
          actionArgument: account.login,
          actionReturnsItems: true,
        },
        {
          title: 'View Issues',
          icon: 'issue.png',
          url: account.issuesURL,
        },
        {
          title: 'View Pull Requests',
          icon: 'pull-request.png',
          url: account.pullRequestsURL,
        },
        {
          title: 'View Gists',
          icon: 'gist.png',
          url: account.gistsURL,
        }
      ]
    }
  }

  openAccountRepositories(login) {
    let account = new Account(login)

    if (LaunchBar.options.commandKey == 1) {
      LaunchBar.openURL(account.repositoriesURL)
    } else {
      return [
        {
          title: 'View All Repositories',
          icon: 'repos.png',
          url: account.repositoriesURL
        }
      ].concat(account.repositories().map(function(repository) {
        return repository.toMenuItem()
      }));
    }
  }
}

let app = new App;

function run(argument) {
  return app.run(argument);
}

function runWithString(string) {
  return app.run(string);
}

// Unfortunately when the script output uses an action argument (like
// openAccount does), it needs to be able to find the function from the global
// scope.
function openAccountRepositories(string) {
  return app.openAccountRepositories(string);
}
