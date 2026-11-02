package com.wambito.app.widget

import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import com.wambito.app.Migration
import es.antonborri.home_widget.HomeWidgetGlanceStateDefinition
import es.antonborri.home_widget.HomeWidgetGlanceWidgetReceiver

/**
 * The medium widget (4×2, spec section 7.1): Wambi's face for the month, "Te quedan" with its
 * progress bar, the month, ＋ and 🎤. It draws the same snapshot as [WambitoSmallWidget].
 */
class WambitoMediumWidget : GlanceAppWidget() {
    override val stateDefinition = HomeWidgetGlanceStateDefinition()
    override val sizeMode = widgetSizeMode

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { StoredWidgetContent() }
    }
}

/** Android's entry for [WambitoMediumWidget]. */
class WambitoMediumWidgetReceiver : HomeWidgetGlanceWidgetReceiver<WambitoMediumWidget>() {
    override val glanceAppWidget = WambitoMediumWidget()

    override fun onReceive(context: Context, intent: Intent) {
        Migration.run(context) // 2b: remove
        super.onReceive(context, intent)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        RefreshScheduler.schedule(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        RefreshScheduler.cancelIfNoWidgets(context)
    }
}
