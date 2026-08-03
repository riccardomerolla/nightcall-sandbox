import { Effect, Schema } from "effect"

import { MiFIDImportError } from "../domain/import-errors"
import { MiFIDProfile } from "../domain/mifid"

export { MiFIDImportError } from "../domain/import-errors"

const importError = (reason: string) => MiFIDImportError.make({ reason })

const parseJson = (source: string) =>
  Effect.try({
    try: (): unknown => JSON.parse(source),
    catch: (cause) =>
      importError(
        `Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`
      )
  })

export const importMiFIDJson = Effect.fn("importMiFIDJson")(function* (
  source: string
) {
  const input = yield* parseJson(source)

  return yield* Schema.decodeUnknownEffect(MiFIDProfile)(input).pipe(
    Effect.mapError((error) =>
      importError(`Invalid MiFID profile: ${error.message}`)
    )
  )
})
