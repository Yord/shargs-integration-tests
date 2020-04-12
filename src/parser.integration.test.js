const {parser} = require('shargs')
const {
  arrayOnRepeat,
  bestGuessArgs,
  bestGuessCast,
  bestGuessOpts,
  broadenBools,
  cast,
  clearRest,
  contradictOpts,
  demandACommand,
  equalsSignAsSpace,
  failRest,
  flagsAsBools,
  flagsAsNumbers,
  implyOpts,
  mergeArgs,
  requireOptions,
  restrictToOnly,
  reverseBools,
  reverseFlags,
  shortOptsNoSpace,
  splitShortOptions,
  suggestOptions,
  traverseArgs,
  traverseArgv,
  traverseOpts,
  verifyArgs,
  verifyArgv,
  verifyOpts,
  verifyRules,
  verifyValuesArity
} = require('shargs-parser')

const {array, bool, command, complement, flag, string} = require('shargs-opts')

const {
  argumentIsNotABool,
  commandRequired,
  contradictionDetected,
  didYouMean,
  falseArgsRules,
  falseArgvRules,
  falseOptsRules,
  falseRules,
  implicationViolated,
  requiredOptionMissing,
  unexpectedArgument,
  valueRestrictionsViolated
} = require('./errors')

const noCommands = opts => opts.filter(({types}) => types !== null)

const filterErrs = keys => errs => errs.map(
  ({info, ...rest}) => Object.keys(info).reduce(
    (acc, key) => ({
      ...acc,
      info: {
        ...acc.info,
        ...(keys.indexOf(key) === -1 ? {[key]: info[key]} : {[key]: undefined})
      }
    }),
    {info: {}, ...rest}
  )
)

const date = array(['date'])

const opts = [
  flag('help', ['--help']),
  flag('verbose', ['-v', '--verbose']),
  flag('popcorn', ['-l', '--low-fat'], {reverse: true}),
  bool('fantasy', ['-E', '--no-hobbits'], {reverse: true, implies: ['genre'], contradicts: ['popcorn']}),
  string('genre', ['-g', '--genre'], {required: true}),
  bool('smile', ['--smile'], {defaultValues: ['yes']}),
  date('date', ['--date'], {defaultValues: ['1977/05/25']}),
  command('rate', ['rate'], {
    opts: [
      {key: 'stars', types: ['number'], args: ['-s', '--stars'], only: ['1', '2', '3', '4', '5']}
    ]
  }),
  string('query', ['-q', '--query'], {
    rules: title => opts => (
      !title.values[0].includes('Supersize Me') ||
      opts.some(_ => _.key === 'popcorn' && _.values.count === 0)
    )
  })
]

const argv = [
  '--query', 'Supersize Me',
  '--query', 'The Hobbit',
  '--colors',
  '-l',
  '--no-hobbits', 'true',
  '-vv',
  '--smile=no',
  'rate',
    '--stars', '8',
    '--help'
]

test('parser without stages works as expected', () => {
  const stages = {}

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser only equalsSignAsSpace works as expected', () => {
  const stages = {
    argv: [equalsSignAsSpace]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'no'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with shortOptsNoSpace works as expected', () => {
  const stages = {
    argv: [shortOptsNoSpace]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', 'v', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    verbose: {type: 'flag', count: 1}
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only splitShortOptions works as expected', () => {
  const stages = {
    argv: [splitShortOptions]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    verbose: {type: 'flag', count: 2}
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only traverseArgv works as expected', () => {
  const isArgvGroup = arg => arg.length > 2 && arg[0] === '-' && arg[1] !== '-'

  const splitArgvGroup = arg => ({
    argv: arg.split('').slice(1).map(c => '-' + c)
  })

  const stages = {
    argv: [traverseArgv(isArgvGroup)(splitArgvGroup)]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    verbose: {type: 'flag', count: 2},
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only verifyArgv works as expected', () => {
  const argvRules = argv => argv.some(_ => _ === '--fancy')

  const checks = {
    argv: [verifyArgv(argvRules)]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    falseArgvRules({argv})
  ]

  const errs2 = filterErrs(['rules'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only arrayOnRepeat works as expected', () => {
  const stages = {
    opts: [arrayOnRepeat]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: ['Supersize Me', 'The Hobbit'],
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only bestGuessOpts works as expected', () => {
  const stages = {
    opts: [bestGuessOpts]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['-vv'],
    fantasy: 'true',
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: [],
      help: {type: 'flag', count: 1},
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    'smile=no': {type: 'flag', count: 1},
    colors: {type: 'flag', count: 1}
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only broadenBools works as expected', () => {
  const stages = {
    opts: [broadenBools({true: ['yes']})]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'true'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only cast works as expected', () => {
  const stages = {
    opts: [cast]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: true,
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: 8
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    argumentIsNotABool({defaultValues: ['yes'], index: 0}),
    argumentIsNotABool({defaultValues: ['yes'], index: 0})
  ]

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only contradictOpts works as expected', () => {
  const stages = {
    opts: [contradictOpts]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    contradictionDetected({key: 'fantasy', contradicts: ['popcorn']})
  ]

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only demandACommand works as expected if no command is present', () => {
  const stages = {
    opts: [demandACommand]
  }

  const opts2 = noCommands(opts)

  const {errs, args} = parser(stages)(opts2)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no', 'rate', '--stars', '8'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    commandRequired({})
  ]

  const errs2 = filterErrs(['options'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only demandACommand works as expected if a command is present', () => {
  const checks = {
    opts: [demandACommand]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only implyOpts works as expected', () => {
  const checks = {
    opts: [implyOpts]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    implicationViolated({key: 'fantasy', implies: ['genre']})
  ]

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only requireOptions works as expected', () => {
  const checks = {
    opts: [requireOptions]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    requiredOptionMissing({key: 'genre', args: ['-g', '--genre']})
  ]

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only restrictToOnly works as expected', () => {
  const stages = {
    opts: [restrictToOnly]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help']
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    valueRestrictionsViolated({key: 'stars', values: ['8'], index: 0, only: ['1', '2', '3', '4', '5']})
  ]

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only reverseBools works as expected', () => {
  const stages = {
    opts: [reverseBools]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'false',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only reverseFlags works as expected', () => {
  const stages = {
    opts: [reverseFlags]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: -1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only suggestOptions works as expected', () => {
  const checks = {
    opts: [suggestOptions]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    didYouMean({argv: '--colors'}),
    didYouMean({argv: '-vv'}),
    didYouMean({argv: '--smile=no'})
  ]

  const errs2 = filterErrs(['options'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only traverseOpts works as expected', () => {
  const isFlag = ({types}) => Array.isArray(types) && types.length === 0

  const hasValidValues = ({values}) => Array.isArray(values) && values.length === 1

  const reverseFlags = opt => ({
    opts: [
      {...opt, values: [-opt.values[0]]}
    ]
  })

  const stages = {
    opts: [
      traverseOpts(opt => isFlag(opt) && hasValidValues(opt))(reverseFlags)
    ]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: -1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: -1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only verifyOpts works as expected', () => {
  const optsRules = opts => (
    !opts.some(_ => _.key === 'genre') ||
    opts.every(_ => _.key !== 'genre' || _.values)
  )

  const checks = {
    opts: [verifyOpts(optsRules)]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    falseOptsRules({})
  ]

  const errs2 = filterErrs(['options', 'rules'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only verifyRules works as expected', () => {
  const checks = {
    opts: [verifyRules]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    falseRules({key: 'query'})
  ]

  const errs2 = filterErrs(['rules', 'option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only verifyValuesArity works as expected', () => {
  const checks = {
    opts: [verifyValuesArity]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs(['option'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only bestGuessArgs works as expected', () => {
  const stages = {
    args: [bestGuessArgs]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['-vv'],
    colors: {type: 'flag', count: 1},
    fantasy: 'true',
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: [],
      help: {type: 'flag', count: 1},
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    'smile=no': {type: 'flag', count: 1},
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only bestGuessCast works as expected', () => {
  const stages = {
    args: [bestGuessCast]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: true,
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: 8
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only clearRest works as expected', () => {
  const stages = {
    args: [clearRest]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: [],
    fantasy: 'true',
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: [],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only failRest works as expected', () => {
  const checks = {
    args: [failRest]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    unexpectedArgument({argument: '--colors'}),
    unexpectedArgument({argument: '-vv'}),
    unexpectedArgument({argument: '--smile=no'}),
    unexpectedArgument({argument: '--help'})
  ]

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only flagsAsBools works as expected', () => {
  const stages = {
    args: [flagsAsBools]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: true,
    date: '1977/05/25',
    popcorn: true,
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only flagsAsNumbers works as expected', () => {
  const stages = {
    args: [flagsAsNumbers]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: 1,
    date: '1977/05/25',
    popcorn: 1,
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only mergeArgs works as expected', () => {
  const stages = {
    args: [mergeArgs()]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no', '--help'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    stars: '8',
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only traverseArgs works as expected', () => {
  const stages = {
    args: [
      traverseArgs({
        flag: ({key, errs, args}) => ({
          errs,
          args: key !== 'popcorn' ? args : {...args, popcorn: true}
        })
      })
    ]
  }

  const {errs, args} = parser(stages)(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: true,
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with only verifyArgs works as expected', () => {
  const argsRules = args => !args.query || args.query.indexOf('Terminator') > -1

  const checks = {
    args: [verifyArgs(argsRules)]
  }

  const stages = {}

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    falseArgsRules({})
  ]

  const errs2 = filterErrs(['rules', 'args'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with custom parser functions for the rate command works as expected', () => {
  const rules = args => !args.query || args.query.indexOf('Terminator') > -1

  const checks = {
    args: [verifyArgs(rules)]
  }

  const stages = {}

  const parsers = {
    rate: parser({
      opts: [cast]
    })
  }

  const {errs, args} = parser(stages, {checks, parsers})(opts)(argv)

  const expArgs = {
    _: ['--colors', '-vv', '--smile=no'],
    fantasy: 'true',
    help: {type: 'flag', count: 1},
    date: '1977/05/25',
    popcorn: {type: 'flag', count: 1},
    rate: {
      _: ['--help'],
      stars: 8
    },
    query: 'Supersize Me',
    smile: 'yes'
  }

  const expErrs = [
    falseArgsRules({})
  ]

  const errs2 = filterErrs(['rules', 'args'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser with custom stages works as expected', () => {
  const flatMap = (f, arr) => arr.reduce((acc, value) => [...acc, ...f(value)], [])

  function splitShortOptions ({errs = [], argv = []} = {}) {
    const argv2 = flatMap(
      arg => arg.length > 2 && arg[0] === '-' && arg[1] !== '-'
        ? arg.slice(1).split('').map(c => '-' + c)
        : [arg],
      argv
    )

    return {errs, argv: argv2}
  }

  function demandACommand ({errs = [], opts = []} = {}) {
    const errs2 = []

    const aCommand = opts.some(
      ({types, values}) => types === null && typeof values !== 'undefined'
    )

    if (!aCommand) {
      errs2.push(commandRequired({options: opts}))
    }

    return {errs: errs.concat(errs2), opts}
  }

  function flagsAsBools ({errs = [], args = {}} = {}) {
    const fs = {
      flag: ({key, val, errs, args}) => ({
        errs,
        args: {...args, [key]: val.count > 0}
      })
    }

    const {errs: errs2, args: args2} = traverseArgs(fs)({args})

    return {errs: errs.concat(errs2), args: args2}
  }

  function dateToYear ({errs = [], opts = []} = {}) {
    const isDate = ({types}) => (
      Array.isArray(types) &&
      types.length === 1 &&
      types[0] === 'date'
    )
  
    const toYear = string => typeof string === 'string' ? new Date(string).getFullYear() : string
  
    const dateToYear = opt => ({
      opts: [{
        ...opt,
        ...(Array.isArray(opt.defaultValues)
            ? {defaultValues: opt.defaultValues.map(toYear)}
            : {}
        ),
        ...(Array.isArray(opt.values)
            ? {values: opt.values.map(toYear)}
            : {}
        )
      }]
    })
  
    return traverseOpts(isDate)(dateToYear)({errs, opts})
  }

  const checks = {
    opts: [demandACommand]
  }

  const stages = {
    argv: [splitShortOptions],
    opts: [dateToYear],
    args: [flagsAsBools]
  }

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '--smile=no'],
    fantasy: 'true',
    help: true,
    date: 1977,
    popcorn: true,
    rate: {
      _: ['--help'],
      stars: '8'
    },
    query: 'Supersize Me',
    smile: 'yes',
    verbose: true
  }

  const expErrs = []

  const errs2 = filterErrs([])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

test('parser works with complex stages setup', () => {
  const argvRules = argv => argv.some(_ => _ === '--fancy')

  const optsRules = opts => (
    !opts.some(_ => _.key === 'genre') ||
    opts.every(_ => _.key !== 'genre' || _.values)
  )

  const argsRules = args => !args.query || args.query.indexOf('Terminator') > -1

  const checks = {
    argv: [
      verifyArgv(argvRules)
    ],
    opts: [
      demandACommand,
      requireOptions,
      verifyOpts(optsRules),
      verifyRules,
      verifyValuesArity,
      implyOpts,
      contradictOpts
    ],
    args: [
      failRest,
      verifyArgs(argsRules)
    ]
  }

  const stages = {
    argv: [
      equalsSignAsSpace,
      splitShortOptions
    ],
    opts: [
      restrictToOnly,
      broadenBools({true: ['yes'], false: ['no']}),
      reverseBools,
      reverseFlags,
      suggestOptions,
      cast,
      arrayOnRepeat
    ],
    args: [
      mergeArgs(),
      traverseArgs({
        flag: ({key, val: {count}, errs, args}) => ({
          errs,
          args: {...args, [key]: key === 'verbose' ? count : count > 0}
        })
      })
    ]
  }

  const {errs, args} = parser(stages, {checks})(opts)(argv)

  const expArgs = {
    _: ['--colors', '--help'],
    fantasy: false,
    help: true,
    date: '1977/05/25',
    popcorn: false,
    query: ['Supersize Me', 'The Hobbit'],
    smile: false,
    verbose: 2
  }

  const expErrs = [
    falseArgvRules({argv}),
    requiredOptionMissing({key: 'genre'}),
    falseOptsRules({}),
    falseRules({key: 'query'}),
    implicationViolated({key: 'fantasy', implies: ['genre']}),
    contradictionDetected({key: 'fantasy', contradicts: ['popcorn']}),
    didYouMean({argv: '--colors'}),
    valueRestrictionsViolated({key: 'stars', values: ['8'], index: 0, only: ['1', '2', '3', '4', '5']}),
    didYouMean({argv: '--help'}),
    unexpectedArgument({argument: '--colors'}),
    unexpectedArgument({argument: '--help'}),
    falseArgsRules({})
  ]

  const errs2 = filterErrs(['args', 'options', 'option', 'rules'])(errs)

  expect(args).toStrictEqual(expArgs)
  expect(errs2).toStrictEqual(expErrs)
})

// shortOptsNoSpace
// bestGuessOpts
// bestGuessArgs
// bestGuessCast
// clearRest
// flagsAsBools
// flagsAsNumbers

test('parser works with complement', () => {
  const tired     = {key: 'tired', types: ['bool'], args: ['-t', '--tired'], defaultValues: ['true']}
  const notTired  = complement('--not-')(tired)
  const badLuck   = {key: 'badLuck', types: [], args: ['--luck'], reverse: true}
  const noBadLuck = complement('--no-')(badLuck)

  const opts = [
    tired,
    notTired,
    badLuck,
    noBadLuck
  ]

  const stages = {
    opts: [reverseBools, reverseFlags, cast],
    args: [flagsAsBools]
  }

  const parse = parser(stages)(opts)

  const argv = ['--not-tired', 'true', '--no-luck']

  const {errs, args} = parse(argv)

  const expErrs = []

  const expArgs = {
    _: [],
    badLuck: true,
    tired: false
  }

  expect(args).toStrictEqual(expArgs)
  expect(errs).toStrictEqual(expErrs)
})