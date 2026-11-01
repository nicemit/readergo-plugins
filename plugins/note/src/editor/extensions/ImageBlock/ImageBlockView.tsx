import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../../markdownUtils'

export const ImageBlockView = (props: NodeViewProps) => {
    const { editor, getPos, node, updateAttributes } = props
    const imageRef = useRef<HTMLImageElement>(null)
    const [resizing, setResizing] = useState(false)
    const [startX, setStartX] = useState(0)
    const [startWidth, setStartWidth] = useState(0)

    const { src, alt, width, align } = node.attrs

    const onResizeStart = useCallback(
        (event: React.PointerEvent) => {
            event.preventDefault()
            if (!imageRef.current) return

                // Capture pointer so move/up events are received even outside the element
                ; (event.target as HTMLElement).setPointerCapture(event.pointerId)

            setResizing(true)
            setStartX(event.clientX)
            setStartWidth(imageRef.current.offsetWidth)
        },
        []
    )

    const onResize = useCallback(
        (event: PointerEvent) => {
            if (!resizing) return

            const currentX = event.clientX
            const diff = currentX - startX
            const newWidth = Math.max(100, startWidth + diff) // Min 100px

            if (imageRef.current) {
                imageRef.current.style.width = `${newWidth}px`
            }
        },
        [resizing, startX, startWidth]
    )

    const onResizeEnd = useCallback(() => {
        if (!resizing) return

        setResizing(false)
        if (imageRef.current) {
            updateAttributes({ width: imageRef.current.style.width })
        }
    }, [resizing, updateAttributes])

    useEffect(() => {
        if (resizing) {
            window.addEventListener('pointermove', onResize)
            window.addEventListener('pointerup', onResizeEnd)
            window.addEventListener('pointercancel', onResizeEnd)
        } else {
            window.removeEventListener('pointermove', onResize)
            window.removeEventListener('pointerup', onResizeEnd)
            window.removeEventListener('pointercancel', onResizeEnd)
        }

        return () => {
            window.removeEventListener('pointermove', onResize)
            window.removeEventListener('pointerup', onResizeEnd)
            window.removeEventListener('pointercancel', onResizeEnd)
        }
    }, [resizing, onResize, onResizeEnd])

    const wrapperClassName = cn(
        'relative group leading-none my-8',
        align === 'left' ? 'flex justify-start' :
            align === 'right' ? 'flex justify-end' :
                'flex justify-center' // default center
    )

    return (
        <NodeViewWrapper className={wrapperClassName}>
            <div
                className={cn(
                    "relative transition-all duration-200 ease-in-out",
                    props.selected && "ring-2 ring-primary ring-offset-2 rounded-lg"
                )}
                style={{ width: width || '100%', maxWidth: '100%' }}
            >
                {/* Image */}
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt}
                    className="block max-w-full h-auto rounded-lg shadow-sm w-full"
                    draggable={false} // Prevent native drag
                />

                {/* Resize Handle (Right) - pointer events for touch + mouse */}
                {props.editor.isEditable && props.selected && (
                    <div
                        className="absolute top-1/2 -right-3 w-6 h-12 -mt-6 cursor-ew-resize flex items-center justify-center bg-transparent group-hover:bg-black/10 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ touchAction: 'none' }}
                        onPointerDown={onResizeStart}
                    >
                        <div className="w-1.5 h-6 bg-white border border-gray-300 rounded-full shadow-sm" />
                    </div>
                )}

                {/* Caption placeholder could go here */}
            </div>
        </NodeViewWrapper>
    )
}
